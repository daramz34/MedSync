from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import User, Medication, MedicationLog, Streak, RefreshToken
from enums import LogStatus,MedicationStatus
from schemas import (LogCreate, RegisterPatient, RegisterAdmin,RegisterDoctor, MedicationCreate, UpdateProfile)
from core.security import verify_password, hash_password, hash_token
from datetime import date, timedelta, timezone
from models import utcnow
import secrets
from core.security import settings


def get_user_by_fullname(db: Session, full_name: str):
    return db.query(User).filter(User.full_name == full_name).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str):
    db_user = get_user_by_email(db, email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None

    return db_user


def create_patient(db:Session, user: RegisterPatient, current_user: User):
    db_user = User(**user.model_dump(exclude={"password"}),
                   hashed_password = hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user



def create_doctor(db:Session, user: RegisterDoctor, current_user: User):
    db_user = User(**user.model_dump(exclude={"password"}),
                   hashed_password = hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_admin(db:Session, user: RegisterAdmin, current_user: User):
    db_user = User(**user.model_dump(exclude={"password"}),
                   hashed_password = hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_profile(db: Session, current_user: User, data: UpdateProfile) -> User:
    updates = data.model_dump(exclude_unset=True)

    # full_name is NOT nullable in the DB — don't let anyone null it
    if "full_name" in updates and updates["full_name"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="full_name cannot be empty",
        )

    allowed_fields = {"full_name", "phone_number"}  # the ONLY things a user may touch
    for field, value in updates.items():
        if field in allowed_fields:
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


def update_profile_picture(db: Session, current_user: User, url: str) -> User:
    current_user.profile_picture_url = url
    db.commit()
    db.refresh(current_user)
    return current_user




def create_refresh_token(db: Session, user_id: int) -> tuple[RefreshToken, str]:
    raw_token = secrets.token_urlsafe(32)          # the ONLY copy of the raw token

    db_token = RefreshToken(
        user_id=user_id,
        token=hash_token(raw_token),               
        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        is_revoked=False,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)

    return db_token, raw_token                     


def _make_timezone_aware(value):
    
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def verify_refresh_token(db: Session, raw_token: str) -> RefreshToken | None:
    token_hash = hash_token(raw_token)

    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == token_hash)
        .first()
    )
    if not db_token:
        return None
    if db_token.is_revoked:
        return None
    if _make_timezone_aware(db_token.expires_at) <= utcnow():
        return None

    return db_token


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_hash = hash_token(raw_token)

    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == token_hash)
        .first()
    )
    if db_token and not db_token.is_revoked:
        db_token.is_revoked = True
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked.is_(False),
        )
        .update({RefreshToken.is_revoked: True}, synchronize_session=False)
    )
    db.commit()
