from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional, Literal
import enums
from datetime import datetime, date, time
import re


class SchemaBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

def _clean_username(v: str) -> str:
    v = v.strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{3,30}", v):
        raise ValueError("3-30 chars, letters/numbers/_.- only, no spaces")
    return v


class RegisterPatient(SchemaBase):
    username: str
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=7, max_length=30)
    _validate_username = field_validator("username")(_clean_username)


class RegisterDoctor(SchemaBase):
    username: str
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=7, max_length=30)
    specialization : enums.Specialization

    _validate_username = field_validator("username")(_clean_username)

class RegisterAdmin(SchemaBase):
    username: str
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    _validate_username = field_validator("username")(_clean_username)


class LoginRequest(SchemaBase):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)




class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: enums.UserRole
    is_verified: bool
    
    specialization: Optional[enums.Specialization] = None
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    created_at: datetime


    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"] = "Bearer"
    user: UserResponse

def normalize_username(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{3,30}", value):
        raise ValueError("Username must be 3–30 characters: letters, numbers, _, . or -")
    return value


class UpdateProfile(SchemaBase):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone_number: str | None = None
    # do NOT add email, role, or profile_picture_url

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str | None:
        return normalize_username(value)

        

class ProfilePictureUpdate(SchemaBase):
    profile_picture_url: str = Field(min_length=1, max_length=500)

class RefreshRequest(SchemaBase):
    refresh_token: str = Field(min_length=1)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"] = "Bearer"



class ForgotPassword(SchemaBase):
    email: EmailStr

class ResetPassword(SchemaBase):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)

class ChangePassword(SchemaBase):
    current_password: str= Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)





class AppointmentCreate(SchemaBase):
    doctor_id: int
    reason : str = Field(min_length=1, max_length=300)
    appointment_date: date
    appointment_time: time


class AppointmentResponse(BaseModel):
    id: int
    patient: Optional[UserResponse] = None
    doctor: Optional[UserResponse] = None
    reason: str = Field(min_length=1, max_length=300)
    notes : Optional[str] = Field(default=None, max_length=300)
    status: enums.AppointmentStatus
    appointment_date: date
    appointment_time: time
    created_at : datetime
    updated_at: datetime

    model_config= ConfigDict(from_attributes=True)

class AppointmentUpdate(SchemaBase):
    status: Optional[enums.AppointmentStatus] = None
    notes: Optional[str] = Field(default=None, max_length=300)


class PaginatedAppointmentResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: list[AppointmentResponse]

    model_config= ConfigDict(from_attributes=True)



class PrescriptionItemCreate(SchemaBase):
    drug_name: str = Field(min_length=1, max_length=255)
    dosage: str =  Field(min_length=1, max_length=100)
    frequency : enums.Frequency
    duration_days: int = Field(gt=0)
    instructions: Optional[str] = Field(default=None, max_length=300)
    drug_reference_id: Optional[int] = None


class PrescriptionItemResponse(BaseModel):
    id: int
    drug_name: str
    dosage: str
    frequency: enums.Frequency
    duration_days: int
    instructions: Optional[str] = None


    model_config = ConfigDict(from_attributes=True)


class PrescriptionCreate(SchemaBase):
    appointment_id: int
    notes: Optional[str] = Field(default=None, max_length=300)
    items: list[PrescriptionItemCreate] = Field(min_length=1)


class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: int
    patient: Optional[UserResponse] = None
    doctor: Optional[UserResponse] = None
    notes: Optional[str] = None
    qr_code_url: Optional[str] = None
    qr_issued_at: Optional[datetime] = None
    qr_expires_at: Optional[datetime] = None
    qr_revoked_at: Optional[datetime] = None
    qr_first_used_at: Optional[datetime] = None
    items: list[PrescriptionItemResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes = True)

class PaginatedPrescriptionResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: list[PrescriptionResponse]



class QRScanRequest(SchemaBase):
    qr_token: str = Field(min_length=1, max_length=255)
    
class QRScanResponse(BaseModel):
    prescription_id: int
    patient: UserResponse
    items: list[PrescriptionItemResponse]
    medications_created: int


    model_config= ConfigDict(from_attributes=True)




class MedicationCreate(SchemaBase):
    drug_name: str = Field(min_length=1, max_length=255)
    dosage: str = Field(min_length=1, max_length=100)
    frequency: enums.Frequency
    duration_days: int = Field(gt=0)
    start_date: date
    reminder_time: Optional[time] = None
    reminder_enabled: bool = True



class MedicationReminderResponse(BaseModel):
    id: int
    time_of_day: time
    label: Optional[str] = None
    enabled: bool

    model_config = ConfigDict(from_attributes=True)


class MedicationResponse(BaseModel):
    id: int
    patient_id: int
    drug_name: str
    dosage: str
    frequency: enums.Frequency
    duration_days: int
    start_date: date
    end_date: Optional[date] = None
    status: enums.MedicationStatus
    reminder_time: Optional[time] = None     
    reminder_enabled: bool
    reminders: list[MedicationReminderResponse] = []   
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicationReminderItem(SchemaBase):
    time_of_day: time
    label: Optional[str] = Field(default=None, max_length=30)
    enabled: bool = True


class MedicationRemindersUpdate(SchemaBase):
    enabled: bool
    times: list[MedicationReminderItem] = []

class MedicationUpdate(SchemaBase):
    status: Optional[enums.MedicationStatus] = None
    reminder_time: Optional[time] = None
    reminder_enabled: Optional[bool] = None


class LogCreate(SchemaBase):
    medication_id: int
    status: enums.LogStatus
    notes: Optional[str]  = Field(default=None, max_length=500)

class LogResponse(BaseModel):
    id: int
    medication_id: int
    log_date: date
    status: enums.LogStatus
    taken_at: Optional[time] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodayLogsResponse(BaseModel):
    date: date
    logs: list[LogResponse] = []



class StreakResponse(BaseModel):
    id: int
    patient_id: int
    medication_id: int
    current_streak: int
    longest_streak: int 
    total_taken: int
    total_missed: int
    total_skipped: int
    completion_percentage: float
    updated_at: datetime

    model_config = ConfigDict(from_attributes = True)




class DrugSearchResponse(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    generic_name: Optional[str] = Field(default=None, max_length=200)
    standard_dosage: Optional[str] =  None
    warnings: Optional[str] =  None
    interactions: Optional[str] = None


class DrugReferenceResponse(BaseModel):
    id: int
    name: str = Field(min_length=2, max_length=255)
    generic_name: Optional[str] = None
    standard_dosage: Optional[str] = None
    warnings: Optional[str] = None
    interactions: Optional[str] = None
    fetched_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DoctorResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: EmailStr
    phone_number: str | None = None
    specialization: str | None = None
    profile_picture_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PublicUserResponse(BaseModel):
    """Safe public profile — no email, phone, or patient_id."""
    id: int
    full_name: str
    role: str
    specialization: str | None = None
    profile_picture_url: str | None = None

    model_config = ConfigDict(from_attributes=True)

class ClinicStats(BaseModel):
    total_patients: int
    total_doctors: int
    total_appointments: int
    appointments_today: int
    pending_appointments: int
    confirmed_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    active_medications: int

class DrugResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int | None = None
    drug_name: str = Field(validation_alias="name")
    description: str | None = Field(default=None, validation_alias="generic_name")
    dosage: str | None = Field(default=None, validation_alias="standard_dosage")
    warnings: str | None = None

class DoctorList(BaseModel):
    doctors: list[UserResponse]
    total: int
    page: int
    limit: int
class PatientResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone_number: str | None = None
    patient_id: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientList(BaseModel):
    total: int
    page: int
    limit: int
    results: list[UserResponse]

    
FeedbackCategory = Literal["bug", "confusion", "suggestion"]
FeedbackStatus = Literal["open", "reviewed", "resolved"]


class FeedbackCreate(SchemaBase):
    category: FeedbackCategory
    message: str = Field(min_length=3, max_length=2000)
    page_url: Optional[str] = Field(default=None, max_length=500)


class FeedbackUpdate(SchemaBase):
    status: FeedbackStatus


class FeedbackResponse(BaseModel):
    id: int
    user: Optional[PublicUserResponse] = None
    page_url: Optional[str] = None
    category: str
    message: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackList(BaseModel):
    total: int
    page: int
    limit: int
    results: list[FeedbackResponse]