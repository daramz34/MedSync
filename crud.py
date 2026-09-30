from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status, Depends
from models import User, Appointment, Prescription, DrugReference,  PrescriptionItem, Medication, MedicationLog, Streak, RefreshToken, PasswordResetToken, utcnow
from enums import UserRole, AppointmentStatus, MedicationStatus, ACTIVE_APPOINTMENT_STATUSES, LogStatus
from schemas import (LogCreate, RegisterPatient, AppointmentUpdate, MedicationUpdate, PrescriptionCreate,
                     AppointmentCreate, RegisterAdmin,RegisterDoctor, MedicationCreate, UpdateProfile)
from core.security import verify_password, hash_password, hash_token
from datetime import date, timedelta, timezone
from utils.qr import make_qr_png, upload_qr_to_cloudinary
import secrets
from core.config import settings
import httpx
from sqlalchemy import func, or_
from core.dependencies import get_current_user

OPENFDA_URL = settings.OPENFDA_URL
CACHE_DAYS = settings.OPENFDA_CACHE_DAYS

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


def create_patient(db: Session, data: RegisterPatient) -> User:
    db_user = User(
        full_name=data.full_name,
        email=str(data.email),
        phone_number=data.phone_number,
        patient_id=data.patient_id,
        hashed_password=hash_password(data.password),
        role=UserRole.PATIENT.value,
    )
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
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.is_used.is_(False),
    ).update({PasswordResetToken.is_used: True}, synchronize_session=False)

    raw_otp = f"{secrets.randbelow(1_000_000):06d}"
    db.add(PasswordResetToken(
        user_id=user_id,
        otp=hash_token(raw_otp),
        expires_at=utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        is_used=False,
    ))
    db.commit()
    return raw_otp          # ← the missing line


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

def cancel_appointment(db: Session,appointment_id: int, current_user: User) -> Appointment:
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




def create_prescription(db: Session, data: PrescriptionCreate, current_user: User) -> Prescription:
    # ---------- 1. GUARD ----------
    if current_user.role != UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can create prescriptions",
        )

    appointment = get_appointment_by_id(db, data.appointment_id, current_user)   # ← db, not data
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Appointment not found")

    if appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You are not the doctor for this appointment")

    if appointment.status != AppointmentStatus.CONFIRMED.value:      # ← .value, column is String(20)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Appointment has not been confirmed")

    already_exists = (
        db.query(Prescription.id)
        .filter(Prescription.appointment_id == appointment.id)
        .first()                                                     # ← the missing .first()
    )
    if already_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="This appointment already has a prescription")

    # ---------- 2. BUILD ----------
    raw_token = secrets.token_urlsafe(32)
    issued_at = utcnow()

    prescription = Prescription(
        appointment_id=appointment.id,                               # ← typo fixed
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        notes=data.notes,
        qr_token_hash=hash_token(raw_token),
        qr_issued_at=issued_at,
        qr_expires_at=issued_at + timedelta(days=settings.QR_TOKEN_EXPIRE_DAYS),
    )
    db.add(prescription)

    
    for item in data.items:
        prescription.items.append(
            PrescriptionItem(
                drug_reference_id=item.drug_reference_id,
                drug_name=item.drug_name,
                dosage=item.dosage,
                frequency=item.frequency.value,
                duration_days=item.duration_days,
                instructions=item.instructions,
            )
        )

    
    try:
        db.flush()          # prescription + items get IDs, still inside the transaction

        
        create_medications_from_prescription(db, prescription)

        qr_bytes = make_qr_png(raw_token)
        prescription.qr_code_url = upload_qr_to_cloudinary(
            qr_bytes,
            public_id=f"prescription-{prescription.id}",
        )

        db.commit()        
    except Exception:
        db.rollback()       
        raise

    db.refresh(prescription)
    return prescription



    


def get_prescription_by_appointment(db, appointment_id, current_user) -> Prescription | None:
    appointment = get_appointment_by_id(db, appointment_id, current_user)
    if appointment is None:
        return None
    return (
        db.query(Prescription)
        .options(joinedload(Prescription.patient),
                 joinedload(Prescription.doctor),
                 selectinload(Prescription.items))
        .filter(Prescription.appointment_id == appointment.id)   # on the QUERY
        .first()
    )

def _prescription_query(db: Session):
    return db.query(Prescription).options(
        joinedload(Prescription.patient),
        joinedload(Prescription.doctor),
        selectinload(Prescription.items),
    )


def get_my_prescriptions(db: Session, current_user: User, page: int = 1, limit: int = 10) -> dict:
    if page < 1 or limit < 1:
        raise HTTPException(status_code=422, detail="Page and limit must be positive")

    query = _prescription_query(db)

    if current_user.role == UserRole.PATIENT.value:
        query = query.filter(Prescription.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR.value:
        query = query.filter(Prescription.doctor_id == current_user.id)
    elif current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Not allowed to view prescriptions")

    total = query.count()
    results = (
        query.order_by(Prescription.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"total": total, "page": page, "limit": limit, "results": results}




def get_prescription_by_id(db, prescription_id, current_user) -> Prescription | None:
    query = (
        db.query(Prescription)
        .options(joinedload(Prescription.patient),
                 joinedload(Prescription.doctor),
                 selectinload(Prescription.items))
        .filter(Prescription.id == prescription_id)
    )
    if current_user.role == UserRole.PATIENT.value:
        query = query.filter(Prescription.patient_id == current_user.id)   # not Appointment.*
    elif current_user.role == UserRole.DOCTOR.value:
        query = query.filter(Prescription.doctor_id == current_user.id)
    elif current_user.role != UserRole.ADMIN.value:
        return None
    return query.first()


def scan_qr(db: Session, qr_token: str, password: str) -> Prescription | None:
    if not qr_token or not password:
        return None

    
    prescription = (
        db.query(Prescription)
        .options(
            joinedload(Prescription.patient),
            selectinload(Prescription.items),
        )
        .filter(Prescription.qr_token_hash == hash_token(qr_token))
        .first()
    )

    if not prescription or not prescription.patient:
        return None

    if prescription.qr_revoked_at is not None or prescription.qr_expires_at is None:
        return None

    if _make_timezone_aware(prescription.qr_expires_at) <= utcnow():
        return None

    expected = prescription.patient.full_name.strip().casefold().encode("utf-8")
    supplied = password.strip().casefold().encode("utf-8")
    if not secrets.compare_digest(expected, supplied):
        return None


    if prescription.qr_first_used_at is None:
        prescription.qr_first_used_at = utcnow()
        db.commit()
        db.refresh(prescription)

    return prescription


def ensure_prescription_medications(db: Session, prescription: Prescription) -> int:
    """Create missing Medication rows; repeated scans don't duplicate them."""
    items = prescription.items
    if not items:
        return 0

    item_ids = [item.id for item in items]

    existing_ids = {
        row[0]
        for row in db.query(Medication.prescription_item_id)
        .filter(Medication.prescription_item_id.in_(item_ids))
        .all()
    }

    start_date = date.today()
    new_medications = []

    for item in items:
        if item.id in existing_ids:
            continue

        frequency = item.frequency
        if hasattr(frequency, "value"):
            frequency = frequency.value

        new_medications.append(
            Medication(
                patient_id=prescription.patient_id,
                prescription_item_id=item.id,
                drug_name=item.drug_name,
                dosage=item.dosage,
                frequency=frequency,
                duration_days=item.duration_days,
                start_date=start_date,
                end_date=start_date + timedelta(days=item.duration_days),
                status=MedicationStatus.ACTIVE.value,
            )
        )

    if new_medications:
        db.add_all(new_medications)
        db.commit()

    return len(new_medications)


def revoke_qr(db: Session, prescription_id: int, current_user: User) -> Prescription | None:
    if current_user.role != UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can revoke prescription QR codes",
        )

   
    prescription = get_prescription_by_id(db, prescription_id, current_user)
    if not prescription:
        return None

    if prescription.qr_revoked_at is None:
        prescription.qr_revoked_at = utcnow()
        db.commit()
        db.refresh(prescription)

    return prescription




def create_medication_manual(db: Session,data: MedicationCreate, current_user: User)-> Medication:
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can add medications",
        )

    medication = Medication(
        patient_id=current_user.id,                                    # from the token, NEVER from the request
        drug_name=data.drug_name,
        dosage=data.dosage,
        frequency=data.frequency.value,                               
        duration_days=data.duration_days,
        start_date=data.start_date,
        end_date=data.start_date + timedelta(days=data.duration_days),
        status=MedicationStatus.ACTIVE.value,
        reminder_time=data.reminder_time,
        reminder_enabled=data.reminder_enabled and data.reminder_time is not None
    )
    db.add(medication)
    db.flush()          

    # every medication gets a streak row from day one
    db.add(Streak(patient_id=current_user.id, medication_id=medication.id))

    db.commit()         
    db.refresh(medication)
    return medication


def create_medications_from_prescription(db: Session, prescription: Prescription) -> list[Medication]:
    """Create (or reuse) one Medication per PrescriptionItem. Caller commits."""
    if not prescription.items:
        return []

    item_ids = [item.id for item in prescription.items]

    # IDEMPOTENCY: prescription_item_id is UNIQUE — reuse what already exists
    existing = (
        db.query(Medication)
        .filter(Medication.prescription_item_id.in_(item_ids))
        .all()
    )
    by_item_id = {m.prescription_item_id: m for m in existing}

    today = date.today()          # blueprint: from-prescription meds start today
    medications = []

    for item in prescription.items:
        medication = by_item_id.get(item.id)

        if medication is None:
            medication = Medication(
                patient_id=prescription.patient_id,
                prescription_item_id=item.id,
                drug_name=item.drug_name,
                dosage=item.dosage,
                frequency=getattr(item.frequency, "value", item.frequency),
                duration_days=item.duration_days,
                start_date=today,
                end_date=today + timedelta(days=item.duration_days),
                status=MedicationStatus.ACTIVE.value,
                reminder_time=None,
                reminder_enabled=False,
            )
            db.add(medication)
            db.flush()
            by_item_id[item.id] = medication

        # repair a missing streak if this helper runs twice
        streak_exists = (
            db.query(Streak.id).filter(Streak.medication_id == medication.id).first()
        )
        if not streak_exists:
            db.add(Streak(patient_id=prescription.patient_id, medication_id=medication.id))

        medications.append(medication)

    db.flush()          # NO commit — the caller decides
    return medications



def get_my_medications(db: Session, current_user: User):
    query = db.query(Medication)
    if current_user.role == UserRole.PATIENT.value:
            query = query.filter(Medication.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR.value:
            query = (
            query.join(Medication.prescription_item)          # Medication → PrescriptionItem
            .join(PrescriptionItem.prescription)              # PrescriptionItem → Prescription
            .filter(Prescription.doctor_id == current_user.id)
        )
    elif current_user.role != UserRole.ADMIN.value:
            return []
    
    
    return query.order_by(Medication.created_at.desc()).all()



def get_medication_by_id(db:Session, medication_id: int, current_user: User):
    query = db.query(Medication).filter(Medication.id == medication_id)
    if current_user.role == UserRole.PATIENT.value:
                query = query.filter(Medication.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR.value:
                query = (
            query.join(Medication.prescription_item)
            .join(PrescriptionItem.prescription)
            .filter(Prescription.doctor_id == current_user.id)
        )
    elif current_user.role != UserRole.ADMIN.value:
                return None
    
    
    return query.first()

def update_medication(
    db: Session,
    medication_id: int,
    data: MedicationUpdate, current_user: User) -> Medication | None:
    # GUARD: patients manage their own tracker (same rule as create_medication_manual)
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can update medications",
        )

    # LOAD: id + ownership in one query — no separate check needed
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.patient_id == current_user.id,
        )
        .first()
    )
    if medication is None:
        return None

    updates = data.model_dump(exclude_unset=True)   # only fields the client actually sent

    if not updates:
        return medication   # nothing to do — don't touch updated_at

    # 1. Never let a client null out a NOT NULL column
    for field in ("status", "reminder_enabled"):
        if field in updates and updates[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null",
            )

    # 2. Resulting-state coherence: reminders can't be ON with no time
    resulting_time = updates.get("reminder_time", medication.reminder_time)
    resulting_enabled = updates.get("reminder_enabled", medication.reminder_enabled)
    if resulting_enabled and resulting_time is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A reminder time is required to enable reminders",
        )

    # 3. ACT
    for field, value in updates.items():
        if field == "status" and value is not None:
            
            value = value.value if isinstance(value, MedicationStatus) else value
        setattr(medication, field, value)

    db.commit()
    db.refresh(medication)
    return medication


def delete_medication(db: Session, medication_id: int, current_user: User) -> Medication | None:
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can delete medications",
        )

    medication = (
        db.query(Medication)
        .filter(
            Medication.id == medication_id,
            Medication.patient_id == current_user.id,
        )
        .first()
    )
    if medication is None:
        return None

    db.delete(medication)   # logs + streak go with it via cascade="all, delete-orphan"
    db.commit()
    return medication





def create_log(db: Session, data: LogCreate, current_user: User) -> MedicationLog | None:
    # GUARD: only patients log their own intake
    if current_user.role != UserRole.PATIENT.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only patients can log medications")

    medication = (
        db.query(Medication)
        .filter(
            Medication.id == data.medication_id,
            Medication.patient_id == current_user.id
        )
        .first()
    )
    if medication is None:
        return None                                  # router → 404

    # STATE: a finished course can't be logged
    if medication.status != MedicationStatus.ACTIVE.value:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot log a medication that is not active",
        )

    today = date.today()
    already = (
        db.query(MedicationLog.id)
        .filter(
            MedicationLog.medication_id == medication.id,
            MedicationLog.log_date == today,
        )
        .first()                                    
    )
    if already:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already logged today")

    # ACT — one transaction: log + streak together
    log = MedicationLog(
        medication_id=medication.id,
        patient_id=current_user.id,
        log_date=today,
        status=data.status.value,
        taken_at=utcnow().time() if data.status == LogStatus.TAKEN else None,
        notes=data.notes,
    )
    db.add(log)
    db.flush()                                       
    update_streak(db, current_user.id, medication.id, data.status)   

    db.commit()                                      # one commit for both rows
    db.refresh(log)
    return log


def get_today_logs(db: Session, current_user: User) -> list[MedicationLog]:
    if current_user.role != UserRole.PATIENT.value:
        return []
    return (
        db.query(MedicationLog)
        .filter(
            MedicationLog.patient_id == current_user.id,
            MedicationLog.log_date == date.today(),
        )
        .order_by(MedicationLog.created_at.desc())
        .all()
    )


def get_medication_logs(
    db: Session, medication_id: int, current_user: User) -> list[MedicationLog] | None:
    
    medication = get_medication_by_id(db, medication_id, current_user)
    if medication is None:
        return None
    return (
        db.query(MedicationLog)
        .filter(MedicationLog.medication_id == medication.id)
        .order_by(MedicationLog.log_date.desc())
        .all()
    )


def get_or_create_streak(db: Session, patient_id: int, medication_id: int) -> Streak:
    streak = db.query(Streak).filter(Streak.medication_id == medication_id).first()
    if streak:
        return streak

    # Safety net — create_medication_manual/create_medications_from_prescription
    # already create this row, so we should rarely land here.
    streak = Streak(patient_id=patient_id, medication_id=medication_id)
    db.add(streak)
    db.flush()                    
    return streak


def update_streak(
    db: Session, patient_id: int, medication_id: int, log_status: LogStatus) -> Streak:
    
    value = log_status.value if isinstance(log_status, LogStatus) else log_status

    streak = get_or_create_streak(db, patient_id, medication_id)

    if value == LogStatus.TAKEN.value:
        streak.current_streak += 1
        streak.total_taken += 1
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    elif value == LogStatus.MISSED.value:
        streak.current_streak = 0
        streak.total_missed += 1
    elif value == LogStatus.SKIPPED.value:
        streak.current_streak = 0
        streak.total_skipped += 1

    attempted = streak.total_taken + streak.total_missed + streak.total_skipped
    streak.completion_percentage = (
        round(streak.total_taken / attempted * 100, 2) if attempted else 0.0
    )

    db.flush()                    
    return streak

def _fetch_openfda(drug_name: str) -> list[dict]:
    params: dict[str, str | int] = {}

    if settings.OPENFDA_API_KEY:                 # only when it's set
        params["api_key"] = settings.OPENFDA_API_KEY   # must come BEFORE search

    params["search"] = (
        f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"'
    )
    params["limit"] = settings.OPENFDA_RESULT_LIMIT

    try:
        resp = httpx.get(
            settings.OPENFDA_URL,
            params=params,
            timeout=settings.OPENFDA_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(503, "Drug information service unavailable")

    if resp.status_code == 404:                  # openFDA's "no matches"
        return []
    resp.raise_for_status()
    return resp.json().get("results", [])


def _extract(result: dict, field: str) -> str | None:
    """OpenFDA returns these as arrays of strings (or absent). Flatten to text."""
    value = result.get(field)
    if isinstance(value, list):
        return " ".join(value) if value else None
    return value


def _fetch_openfda(drug_name: str) -> list[dict]:
    params = {
        "search": f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
        "limit": 5,
    }
    try:
        resp = httpx.get(OPENFDA_URL, params=params, timeout=10.0)
    except httpx.RequestError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Drug information service unavailable"
        )
    if resp.status_code == 404:            # OpenFDA's "no matches" is a 404
        return []
    resp.raise_for_status()
    return resp.json().get("results", [])


def get_cached_drug(db: Session, drug_name: str) -> DrugReference | None:
    ref = (
        db.query(DrugReference)
        .filter(func.lower(DrugReference.name) == drug_name.strip().lower())
        .order_by(DrugReference.fetched_at.desc())
        .first()
    )
    if ref is None or ref.fetched_at is None:
        return None
    # SQLite hands back naive datetimes — re-attach UTC before comparing
    if _make_timezone_aware(ref.fetched_at) < utcnow() - timedelta(days=CACHE_DAYS):
        return None                        # stale → caller refetches
    return ref


def _cache_drug(db: Session, result: dict) -> DrugReference | None:
    openfda = result.get("openfda") or {}
    brand = (openfda.get("brand_name") or [None])[0]
    generic = (openfda.get("generic_name") or [None])[0]
    name = brand or generic
    if not name:
        return None                        # nothing useful to store

    set_id = result.get("set_id")
    effective_time = result.get("effective_time")

    # Respect UNIQUE(openfda_set_id, effective_time)
    existing = (
        db.query(DrugReference)
        .filter(
            DrugReference.openfda_set_id == set_id,
            DrugReference.effective_time == effective_time,
        )
        .first()
    )
    if existing:
        return existing

    ref = DrugReference(
        name=name,
        generic_name=generic,
        standard_dosage=_extract(result, "dosage_and_administration"),
        warnings=_extract(result, "warnings") or _extract(result, "boxed_warning"),
        interactions=_extract(result, "drug_interactions"),
        openfda_set_id=set_id,
        effective_time=effective_time,
        fetched_at=utcnow(),
    )
    db.add(ref)
    db.flush()
    return ref


def search_drug(db: Session, drug_name: str) -> list[DrugReference]:
    cached = get_cached_drug(db, drug_name)
    if cached:
        return [cached]

    results = _fetch_openfda(drug_name)
    saved = [ref for ref in (_cache_drug(db, r) for r in results) if ref]

    if saved:
        db.commit()
        for ref in saved:
            db.refresh(ref)
    return saved


def get_clinic_stats(db: Session) -> dict:
    today = date.today()
    A = AppointmentStatus
    return {
        "total_patients": db.query(User).filter(User.role == UserRole.PATIENT.value).count(),
        "total_doctors": db.query(User).filter(User.role == UserRole.DOCTOR.value).count(),
        "total_appointments": db.query(Appointment).count(),
        "appointments_today": db.query(Appointment).filter(Appointment.appointment_date == today).count(),
        "pending_appointments": db.query(Appointment).filter(Appointment.status == A.PENDING.value).count(),
        "confirmed_appointments": db.query(Appointment).filter(Appointment.status == A.CONFIRMED.value).count(),
        "completed_appointments": db.query(Appointment).filter(Appointment.status == A.COMPLETED.value).count(),
        "cancelled_appointments": db.query(Appointment).filter(Appointment.status == A.CANCELLED.value).count(),
        "active_medications": db.query(Medication).filter(Medication.status == MedicationStatus.ACTIVE.value).count(),
    }


def get_all_patients(db: Session, page: int = 1, limit: int = 10) -> dict:
    if page < 1 or limit < 1:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "page and limit must be positive")

    query = db.query(User).filter(User.role == UserRole.PATIENT.value)
    total = query.count()
    results = (
        query.order_by(User.full_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"total": total, "page": page, "limit": limit, "results": results}


def delete_user(db: Session, user_id: int, current_user: User) -> User | None:
    if user_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None

    
    has_history = (
        db.query(Appointment.id)
        .filter(or_(Appointment.patient_id == user_id, Appointment.doctor_id == user_id))
        .first()
    )
    if has_history:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "User has appointments; deactivate instead of deleting",
        )

    db.delete(user)      # cascades refresh tokens, reset tokens, meds, logs, streaks
    db.commit()
    return user


def get_or_fetch_drug(db: Session, drug_name: str) -> list[dict]:
    """Read-through: fresh DB row if < OPENFDA_CACHE_DAYS old, else hit OpenFDA and upsert."""
    cached = get_cached_drug(db, drug_name)          # your existing 7-day DB cache
    if cached is not None:
        return [cached] if isinstance(cached, dict) else [cached]

    results = search_drug(drug_name)                 # your existing OpenFDA call → list[dict]
    # persist into DrugReference here (align with your model's columns), then return results
    return results

def get_drug_by_id(db: Session, drug_id: int) -> DrugReference | None:
    return db.query(DrugReference).filter(DrugReference.id == drug_id).first()
