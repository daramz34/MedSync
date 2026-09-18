from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    DOCTOR = "doctor"
    ADMIN = "admin"


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Specialization(str, Enum):
    GENERAL = "general"
    DENTIST = "dentist"
    OPTOMETRIST = "optometrist"
    PSYCHOLOGIST = "psychologist"
    PHYSIOTHERAPIST = "physiotherapist"


class Frequency(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    WEEKLY = "weekly"


class MedicationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class LogStatus(str, Enum):
    TAKEN = "taken"
    MISSED = "missed"
    SKIPPED = "skipped"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    PASSWORD_RESET = "password_reset"

ACTIVE_APPOINTMENT_STATUSES: frozenset[AppointmentStatus] = frozenset(
    {AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED}
)
