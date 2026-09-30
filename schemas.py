from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional, Literal
import enums
from datetime import datetime, date, time

class SchemaBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterPatient(SchemaBase):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=7, max_length=30)
    patient_id: Optional[str] = Field(default=None, max_length=50)


class RegisterDoctor(SchemaBase):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: str = Field(min_length=7, max_length=30)
    specialization : enums.Specialization

class RegisterAdmin(SchemaBase):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(SchemaBase):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)




class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: enums.UserRole
    is_verified: bool
    patient_id: Optional[str] = None
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


class UpdateProfile(SchemaBase):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone_number: Optional[str] = Field(default=None, min_length=7, max_length=30)


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
    password: str = Field(min_length=1, max_length=150)

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
    created_at: datetime


    model_config= ConfigDict(from_attributes=True)


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


class DoctorList(BaseModel):
    doctors: list[UserResponse]
    total: int
    page: int
    limit: int


class PatientList(BaseModel):
    total: int
    page: int
    limit: int
    results: list[UserResponse]
