from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from models import User, Appointment, Prescription, Medication, MedicationLog, Streak, RefreshToken, PasswordResetToken, utcnow
from enums import UserRole, AppointmentStatus, ACTIVE_APPOINTMENT_STATUSES
from schemas import (LogCreate, RegisterPatient, AppointmentUpdate,
                     AppointmentCreate, RegisterAdmin,RegisterDoctor, MedicationCreate, UpdateProfile)
from core.security import verify_password, hash_password, hash_token
from datetime import date, timedelta, timezone

import secrets
from core.config import settings
from core.dependencies import get_current_user

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
    db_user = User(full_name=user.full_name,
                   email=user.email,
                    phone_number=user.phone_number,
                    patient_id=user.patient_id,
                    hashed_password=hash_password(user.password),
                    role=UserRole.PATIENT.value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user



def create_doctor(db: Session, data: RegisterDoctor) -> User:
    db_doctor = User(
        full_name=data.full_name,
        email=str(data.email),
        phone_number=data.phone_number,
        specialization=data.specialization.value,   
        hashed_password=hash_password(data.password),
        role=UserRole.DOCTOR.value               
    )

    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)      # loads the DB-generated id

    return db_doctor

def create_admin(db: Session, user: RegisterAdmin) -> User:
    db_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hash_password(user.password),
        role=UserRole.ADMIN.value,
    )
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

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


def create_otp(db: Session, user_id: int) -> str:
    """Create a password-reset OTP. Returns the RAW otp to be emailed."""
    
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.is_used.is_(False)).update({PasswordResetToken.is_used: True},synchronize_session=False)
    db.commit()

    raw_otp = f"{secrets.randbelow(1_000_000):06d}"

    otp_record = PasswordResetToken(
        user_id=user_id,
        otp=hash_token(raw_otp),                      # store the hash only
        expires_at=utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        is_used=False,
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)


def verify_otp(db: Session, email: str, otp: str) -> PasswordResetToken | None:
    """Find and validate an OTP. Returns the record, or None."""
    user = get_user_by_email(db, email)
    if not user:
        return None

    otp_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.otp == hash_token(otp),
            PasswordResetToken.is_used.is_(False)).order_by(PasswordResetToken.created_at.desc()).first()
    )

    if not otp_record:
        return None
    if _make_timezone_aware(otp_record.expires_at) <= utcnow():
        return None

    return otp_record


def use_otp(db: Session, otp_record: PasswordResetToken) -> None:
    """Burn the OTP so it can never be reused."""
    if not otp_record.is_used:
        otp_record.is_used = True
        db.commit()
    
def reset_password(db: Session, user_id: int, new_password: str) -> User:
    """Hash + save the new password and log the user out of every device."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.hashed_password = hash_password(new_password)
    user.is_verified = True          

    db.commit()
    db.refresh(user)

    revoke_all_user_tokens(db, user_id)   
    return user



def create_appointment(db:Session, data: AppointmentCreate, current_user:User):
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can book appointments",
        )
    

    doctor = (db.query(User).filter(User.id == data.doctor_id, User.role == UserRole.DOCTOR.value).first())

    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found",)
    

    active_statuses = [s.value for s in ACTIVE_APPOINTMENT_STATUSES]

    conflict = (
        db.query(Appointment.id)
        .filter(
            Appointment.patient_id == current_user.id,
            Appointment.doctor_id == data.doctor_id,
            Appointment.appointment_date == data.appointment_date,
            Appointment.status.in_(active_statuses),
        )
        .first()
    )

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active appointment with this doctor on that date",
        )
    
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        reason=data.reason,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        status=AppointmentStatus.PENDING.value,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment




def get_my_appointments(db: Session, current_user: User, page: int = 10, limit: int = 10, status: AppointmentStatus | None =None) -> dict:

    if page < 1 or limit < 1:
        raise HTTPException(422, "Page and limit must be positive")

    query = db.query(Appointment)

    if current_user.role == UserRole.PATIENT.value:
        query = query.filter(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR.value:
        query = query.filter(Appointment.doctor_id == current_user.id)

    elif current_user.role == UserRole.ADMIN.value:
        pass  # admin sees all

    else:
        raise HTTPException(403, "You are not allowed to view appointments")

    if status is not None:
        query = query.filter(Appointment.status == status.value)

    total = query.count()

    results = (
        query.order_by(
            Appointment.appointment_date.asc(),
            Appointment.appointment_time.asc(),
            Appointment.id.asc(),
        )
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {"total": total, "page": page, "limit": limit, "results": results}


def get_appointment_by_id(db: Session, appointment_id: int, current_user: User)-> Appointment | None:
    query = db.query(Appointment).filter(Appointment.id == appointment_id)
    if current_user.role == UserRole.PATIENT.value:
            query = query.filter(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR.value:
            query = query.filter(Appointment.doctor_id == current_user.id)
    
    elif current_user.role == UserRole.ADMIN.value:
            pass  # admin sees all
    else:
        return None


    return query.first()


def update_appointment(db: Session, appointment_id: int, data: AppointmentUpdate, current_user: User):
    if current_user.role != UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,   
            detail="Only doctors can update appointments"
        )
    appointment = get_appointment_by_id(db, appointment_id, current_user)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    updates = data.model_dump(exclude_unset=True)

    if "status" in updates:
        status_value = updates["status"]
        if isinstance(status_value, AppointmentStatus):
            status_value = status_value.value

        
        if status_value == AppointmentStatus.COMPLETED.value:
            exists = (
                db.query(Prescription.id)
                .filter(Prescription.appointment_id == appointment.id)
                .first()
            )
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Appointment cannot be completed without a prescription",
                )

        updates["status"] = status_value      # DB stores strings

    for field, value in updates.items():
        setattr(appointment, field, value)

    db.commit()
    db.refresh(appointment)
    return appointment

def cancel_appointment(
    db: Session,
    appointment_id: int,
    current_user: User) -> Appointment:
    # Only patients cancel
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can cancel appointments",
        )

    # Ownership check for free: a patient can only reach their own rows
    appointment = get_appointment_by_id(db, appointment_id, current_user)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

  #only PENDING can be cancelled
    if appointment.status != AppointmentStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending appointments can be cancelled",
        )

    appointment.status = AppointmentStatus.CANCELLED.value
    
    db.commit()
    db.refresh(appointment)
    return appointment

def get_all_doctors(db: Session, page: int = 1, limit: int = 10) -> dict:
    if page < 1 or limit < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Page and limit must be positive"
        )

    query = db.query(User).filter(User.role == UserRole.DOCTOR.value)

    total = query.count()

    doctors = (
        query
        .order_by(User.full_name.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {"doctors": doctors, "total": total, "page": page, "limit": limit}
