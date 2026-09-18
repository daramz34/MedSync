from sqlalchemy import Column, String, Integer,UniqueConstraint, Float,Date,Time,Text, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone, date, time
from enums import UserRole, AppointmentStatus, Specialization, Frequency, MedicationStatus, LogStatus,TokenType
def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    fullname = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.STUDENT.value)
    is_verified = Column(Boolean, nullable=False, default=False)
    matric_number = Column(String(50), nullable=True)
    specialization = Column(String(30), nullable=True)
    phone_number = Column(String(30), nullable=True)
    profile_picture_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    #relationships
    refresh_token = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    reset_token = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    student_appointments = relationship("Appointment", back_populates="student",foreign_keys="[Appointment.student_id]", cascade="all, delete-orphan")
    doctor_appointments = relationship("Appointment", back_populates="doctor",foreign_keys="[Appointment.doctor_id]")
    student_prescriptions = relationship("Prescription", back_populates="students_prescriptions",foreign_keys="[Prescription.student_id]", cascade="all, delete-orphan")
    doctor_prescriptions = relationship("Prescription", back_populates="doctor_prescriptions", foreign_keys="[Prescription.doctor_id]")
    medication = relationship("Medication", back_populates="student", foreign_keys="Medication.student_id", cascade="all, delete-orphan")

    log = relationship("MedicationLog", back_populates="student",foreign_keys="MedicationLog.student_id", cascade="all, delete-orphan")
    streak = relationship("Streak", back_populates="student", foreign_keys="Streak.student_id", cascade="all, delete-orphan")

class RefreshToken(Base):
    __tablename__ = "refresh_token"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),index=True,  nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)          # 7 days from creation
    is_revoked = Column(Boolean,nullable=False,  default=False) 
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_token")



class PasswordResetToken(Base):
    __tablename__ = "password_reset_token"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    otp = Column(String(6), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)          # 7 days from creation
    is_used = Column(Boolean, nullable=False, default=False) 
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="reset_token")




class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    reason = Column(Text)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default=AppointmentStatus.PENDING.value) 
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


    student = relationship("User", back_populates="student_appointments", foreign_keys=[student_id])
    doctor = relationship("User", back_populates="doctor_appointments", foreign_keys=[doctor_id])
    prescriptions = relationship("Prescription", back_populates="appointment", cascade="all, delete-orphan")






class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True)
    appointment_id = Column(String, ForeignKey("appointments.id", ondelete="CASCADE"), index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),index=True, nullable=False)
    doctor_id = Column(Integer,ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    notes = Column(Text, nullable=True)
    qr_code_url = Column(String, nullable=True)
    qr_token_hash = Column(String(64), unique=True, nullable=True, index=True)
    qr_expires_at = Column(DateTime(timezone=True), nullable=True)
    qr_issued_at = Column(DateTime(timezone=True), nullable=True)
    qr_revoked_at = Column(DateTime(timezone=True), nullable=True)
    qr_first_used_at = Column(DateTime(timezone=True), nullable=True)
    is_scanned = Column(Boolean, default=False, nullable=False)
    scanned_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    appointment = relationship("Appointment", back_populates="prescriptions")
    prescription_item = relationship("PrescriptionItme", back_populates="prescriptions", cascade="all, delete-orphan")
    student_prescriptions = relationship("User", back_populates="student_prescriptions", foreign_keys=[student_id])
    doctor_prescriptions = relationship("User", back_populates="doctor_prescriptions", foreign_keys=[doctor_id])



class DrugReference(Base):
    __tablename__ = "drug_references"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=True)
    standard_dosage = Column(Text, nullable=True)
    warnings = Column(Text, nullable=True)
    interactions = Column(Text, nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class PrescriptionItem(Base):
    __tablename__ = "prescription_item"
    id = Column(Integer, primary_key=True)
    prescription_id = Column(String, ForeignKey("prescriptions.id", ondelete="CASCADE"), index=True, nullable=False)
    drug_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(30), default=Frequency.THREE_TIMES_DAILY.value, nullable=False)
    duration_days = Column(Integer, nullable=False)
    insructions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    prescriptions = relationship("Prescription", back_populates="prescription_item")
    medication = relationship("Medication", back_populates="prescriptionitem", uselist=False)




class Medication(Base):
    __tablename__ = "medications"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),index=True, nullable=False) # foreignkey
    prescriptionitem = Column(Integer, ForeignKey("prescription_item.id", ondelete="SET NULL"), nullable=True, index=True, unique=True)
    drug_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(30), default=Frequency.THREE_TIMES_DAILY.value, nullable=False)
    duration_days = Column(Integer, nullable=False)
    start_date = Column(Date, default=date.today, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default=MedicationStatus.ACTIVE.value, nullable=False)
    reminder_time = Column(Time, nullable=True)
    reminder_enabled = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


    student = relationship("User", back_populates="medication", foreign_keys=[student_id])
    prescriptionitem = relationship("PrescriptionItem", back_populates="medicaton")
    log = relationship("MedicationLog", back_populates="medication", cascade="all, delete-orphan")
    streak = relationship("Streak", back_populates="medication", uselist=False,  cascade="all, delete-orphan")



class MedicationLog(Base):
    __tablename__ = "logs"
    __table_args__ = (
        UniqueConstraint("medication_id", "date", name="uq_medication_log_per_day"),
    )
    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), index=True, nullable=False)  # foreignkey
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False) # foreignkey
    log_date = Column("date", Date, default=date.today, nullable=False)
    status = Column(String(20), nullable=False)
    taken_at = Column(Time, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    student  = relationship("User", back_populates="log", foreign_keys=[student_id])
    medication = relationship("Medication", back_populates="log")



class Streak(Base):
    __tablename__ = "streaks"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"),index=True, unique=True, nullable=False)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False,default=0)
    total_taken = Column(Integer, nullable=False,default=0)
    total_missed = Column(Integer, nullable=False,default=0)
    total_skipped = Column(Integer, nullable=False,default=0)
    completion_percentage = Column(Float, nullable=False,default=0.0)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    student = relationship("User", back_populates="streak", foreign_keys=[student_id])
    medication = relationship("Medication", back_populates="streak")

