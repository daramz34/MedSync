from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, Time, UniqueConstraint)
from sqlalchemy.orm import relationship
from database import Base
from enums import AppointmentStatus, MedicationStatus, UserRole


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(150), nullable=False)
    username = Column(String(30), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False, default=UserRole.PATIENT.value)
    is_verified = Column(Boolean, nullable=False, default=False)

    patient_id = Column(String(50), nullable=True, unique=True)  # patients only
    specialization = Column(String(30), nullable=True)               # doctors only
    phone_number = Column(String(30), nullable=True)                 # String: keeps leading 0
    profile_picture_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    refresh_tokens = relationship(
        "RefreshToken", back_populates="user",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    password_reset_tokens = relationship(
        "PasswordResetToken", back_populates="user",
        cascade="all, delete-orphan", passive_deletes=True,
    )

    patient_appointments = relationship(
        "Appointment", back_populates="patient",
        foreign_keys="Appointment.patient_id",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    doctor_appointments = relationship(
        "Appointment", back_populates="doctor",
        foreign_keys="Appointment.doctor_id",
        cascade="all, delete-orphan", passive_deletes=True,
    )

    patient_prescriptions = relationship(
        "Prescription", back_populates="patient",
        foreign_keys="Prescription.patient_id",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    doctor_prescriptions = relationship(
        "Prescription", back_populates="doctor",
        foreign_keys="Prescription.doctor_id",
        cascade="all, delete-orphan", passive_deletes=True,
    )

    medications = relationship(
        "Medication", back_populates="patient",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    medication_logs = relationship(
        "MedicationLog", back_populates="patient",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    streaks = relationship(
        "Streak", back_populates="patient",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)   # 7 days
    is_revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    user = relationship("User", back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    otp = Column(String(64), nullable=False, index=True)          # NOT unique — 6-digit codes collide
    expires_at = Column(DateTime(timezone=True), nullable=False)   # ~10 minutes
    is_used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    user = relationship("User", back_populates="password_reset_tokens")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    reason = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default=AppointmentStatus.PENDING.value)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=utcnow, onupdate=utcnow)

    patient = relationship("User", back_populates="patient_appointments",
                           foreign_keys=[patient_id])
    doctor = relationship("User", back_populates="doctor_appointments",
                          foreign_keys=[doctor_id])
    prescriptions = relationship(
        "Prescription", back_populates="appointment",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # the image the doctor shows / prints
    qr_code_url = Column(String(500), nullable=True)

    # the secret INSIDE the image — store the hash, never the raw token
    qr_token_hash = Column(String(64), unique=True, nullable=True, index=True)
    qr_issued_at = Column(DateTime(timezone=True), nullable=True)
    qr_expires_at = Column(DateTime(timezone=True), nullable=True)
    qr_revoked_at = Column(DateTime(timezone=True), nullable=True)
    qr_first_used_at = Column(DateTime(timezone=True), nullable=True)  # audit only

    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    appointment = relationship("Appointment", back_populates="prescriptions")
    patient = relationship("User", back_populates="patient_prescriptions",
                           foreign_keys=[patient_id])
    doctor = relationship("User", back_populates="doctor_prescriptions",
                          foreign_keys=[doctor_id])
    items = relationship(
        "PrescriptionItem", back_populates="prescription",
        cascade="all, delete-orphan", passive_deletes=True,
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    drug_reference_id = Column(Integer, ForeignKey("drug_references.id", ondelete="SET NULL"),
                               nullable=True, index=True)
    drug_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(30), nullable=False)
    duration_days = Column(Integer, nullable=False)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    prescription = relationship("Prescription", back_populates="items")
    drug_reference = relationship("DrugReference", back_populates="prescription_items")
    medication = relationship("Medication", back_populates="prescription_item",
                              uselist=False)


class DrugReference(Base):
    __tablename__ = "drug_references"
    __table_args__ = (
        UniqueConstraint("openfda_set_id", "effective_time",
                         name="uq_drug_reference_label_version"),
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=True)
    standard_dosage = Column(Text, nullable=True)   # reference text only — never auto-fill
    warnings = Column(Text, nullable=True)
    interactions = Column(Text, nullable=True)
    openfda_set_id = Column(String(100), nullable=True)
    effective_time = Column(String(20), nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    prescription_items = relationship(
        "PrescriptionItem", back_populates="drug_reference", passive_deletes=True,
    )


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    prescription_item_id = Column(
        Integer,
        ForeignKey("prescription_items.id", ondelete="SET NULL"),
        unique=True, nullable=True, index=True,
    )
    drug_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(30), nullable=False)
    duration_days = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False, default=date.today)
    end_date = Column(Date, nullable=True)      # None = ongoing / no fixed end
    status = Column(String(20), nullable=False, default=MedicationStatus.ACTIVE.value)
    reminder_time = Column(Time, nullable=True)  # None for manually added meds
    reminder_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    patient = relationship("User", back_populates="medications")
    prescription_item = relationship("PrescriptionItem",
                                     back_populates="medication", uselist=False)
    logs = relationship(
        "MedicationLog", back_populates="medication",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    streak = relationship(
        "Streak", back_populates="medication",
        cascade="all, delete-orphan", uselist=False, passive_deletes=True,
    )


class MedicationLog(Base):
    __tablename__ = "medication_logs"
    __table_args__ = (
        UniqueConstraint("medication_id", "date", name="uq_medication_log_per_day"),
    )

    id = Column(Integer, primary_key=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    log_date = Column("date", Date, nullable=False, default=date.today)
    status = Column(String(20), nullable=False)
    taken_at = Column(Time, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    patient = relationship("User", back_populates="medication_logs")
    medication = relationship("Medication", back_populates="logs")


class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    medication_id = Column(Integer,ForeignKey("medications.id", ondelete="CASCADE"),unique=True, nullable=False, index=True)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    total_taken = Column(Integer, nullable=False, default=0)
    total_missed = Column(Integer, nullable=False, default=0)
    total_skipped = Column(Integer, nullable=False, default=0)
    completion_percentage = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=utcnow, onupdate=utcnow)

    patient = relationship("User", back_populates="streaks")
    medication = relationship("Medication", back_populates="streak", uselist=False)
