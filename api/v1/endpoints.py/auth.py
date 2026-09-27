from database import get_db
from schemas import (RegisterDoctor,LoginResponse, ForgotPassword, RefreshRequest, RegisterPatient,
                     UserResponse, TokenResponse, UpdateProfile, ResetPassword,
                     ChangePassword)
from crud import (create_patient,verify_refresh_token, revoke_refresh_token, create_refresh_token,  
                 require_admin, create_doctor, authenticate_user, get_user_by_email, 
                 create_otp, verify_otp, use_otp, reset_password, update_profile, update_profile_picture)
from fastapi import APIRouter,BackgroundTasks, File, UploadFile, HTTPException, status, Depends
from sqlalchemy.orm import Session
from types import SimpleNamespace
from core.security import create_access_token, verify_password
from core.dependencies import get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from services.email import send_welcome_email, send_doctor_welcome_email, send_otp_email
from models import User
import logging
from core.cloudinary import upload

from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["AUTH"])

@router.post("/register", response_model=UserResponse,
             status_code=status.HTTP_201_CREATED, description="Register")
def register(user: RegisterPatient, db: Session = Depends(get_db)):

    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    if user.patient_id and db.query(User.id).filter(
        User.patient_id == user.patient_id
    ).first():
        raise HTTPException(status_code=409, detail="That patient ID is already registered")

    try:
        db_patient = create_patient(db, data=user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email or patient ID already registered")

    try:
        send_welcome_email(db_patient)
    except Exception:
        logger.exception("Welcome email failed for %s", db_patient.email)

    return db_patient

@router.post("/register/doctor", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_doctor(user: RegisterDoctor, db: Session=Depends(get_db), _admin: User = Depends(require_admin)):
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=409, detail="Email already registered")



    try:
        db_doctor = create_doctor(db, data=user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    return db_doctor

@router.post("/login", response_model=LoginResponse, description="User Login")
def login(request: OAuth2PasswordRequestForm = Depends(), db: Session=Depends(get_db)):
    user = authenticate_user(db, request.username, request.password)

    if not user:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(user)
    _, raw_refresh_token = create_refresh_token(db, user.id)

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "Bearer",
        "user": user,
    }



@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(data: RefreshRequest, db: Session = Depends(get_db)):
    old_token = verify_refresh_token(db, data.refresh_token)
    if old_token is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == old_token.user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # rotation: kill the old token, issue a brand-new pair
    revoke_refresh_token(db, data.refresh_token)
    access_token = create_access_token(user)
    _, raw_refresh_token = create_refresh_token(db, user.id)

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "Bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, data.refresh_token)   # idempotent


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPassword,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, str(data.email))

    # same response whether or not the account exists — don't leak which emails are registered
    if user:
        otp = create_otp(db, user.id)
        # pass plain values, not a DB-bound ORM object
        mail_target = SimpleNamespace(email=user.email, full_name=user.full_name)
        background_tasks.add_task(send_otp_email, mail_target, otp)

    return {"detail": "If that email is registered, an OTP has been sent."}
@router.post("/reset-password")
def reset_password_with_otp(data: ResetPassword, db: Session = Depends(get_db)):
    otp_record = verify_otp(db, str(data.email), data.otp)
    if otp_record is None:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user_id = otp_record.user_id
    use_otp(db, otp_record)
    reset_password(db, user_id, data.new_password)
    return {"detail": "Password reset successfully."}


@router.post("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    reset_password(db, current_user.id, data.new_password)   # also revokes all refresh tokens
    return {"detail": "Password changed successfully."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def edit_me(
    data: UpdateProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user, data)


@router.post("/me/picture", response_model=UserResponse)
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP image")

    image_bytes = file.file.read(5 * 1024 * 1024 + 1)      # cap at 5 MB
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")

    try:
        result = upload(
            image_bytes,
            folder="medsync/profile-pictures",
            public_id=f"user-{current_user.id}",
            overwrite=True,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp"],
        )
        image_url = result["secure_url"]
    except Exception:
        logger.exception("Profile picture upload failed for user %s", current_user.id)
        raise HTTPException(status_code=502, detail="Could not upload profile picture")

    return update_profile_picture(db, current_user, image_url)