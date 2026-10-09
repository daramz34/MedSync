import logging
import threading
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import or_

from core.config import settings
from database import SessionLocal
from enums import AppointmentStatus, MedicationStatus
from models import Appointment, Medication, MedicationLog, utcnow
from services import email as email_service

logger = logging.getLogger(__name__)

WAT = ZoneInfo(settings.REMINDER_TIMEZONE)
scheduler = BackgroundScheduler(timezone=WAT)


_redis_client: Redis | None = None
if settings.REDIS_URL:
    try:
        _redis_client = Redis.from_url(
            settings.REDIS_URL, decode_responses=True,
            socket_connect_timeout=2, socket_timeout=2,
        )
    except Exception:
        logger.warning("Redis unavailable — reminder dedup uses in-process memory")

_memory_claims: dict[str, float] = {}
_memory_lock = threading.Lock()


def _claim(key: str, ttl_seconds: int) -> bool:
    """Atomically claim a reminder slot. True = we own it, go send."""
    if _redis_client is not None:
        try:
            return bool(_redis_client.set(f"medsync:{key}", "1", nx=True, ex=ttl_seconds))
        except RedisError:
            logger.warning("Redis error — falling back to in-process dedup")

    now = time.monotonic()
    with _memory_lock:
        for k in [k for k, exp in _memory_claims.items() if exp <= now]:
            _memory_claims.pop(k, None)
        if key in _memory_claims:
            return False
        _memory_claims[key] = now + ttl_seconds
        return True


def _release(key: str) -> None:
    """Give the slot back if sending failed, so it can retry."""
    if _redis_client is not None:
        try:
            _redis_client.delete(f"medsync:{key}")
            return
        except RedisError:
            logger.warning("Redis error — could not release reminder slot")
    with _memory_lock:
        _memory_claims.pop(key, None)


# ------------------------------------------------------------- job 1
def check_and_send_reminders() -> None:
    """Every minute: email one reminder per due dose (WAT)."""
    now_wat = datetime.now(WAT)
    today = now_wat.date()
    db = SessionLocal()
    try:
        meds = (
            db.query(Medication)
            .filter(
                Medication.status == MedicationStatus.ACTIVE.value,
                Medication.reminder_enabled.is_(True),
                Medication.start_date <= today,
                or_(Medication.end_date.is_(None),
                    Medication.end_date >= today),
            )
            .all()
        )

        for med in meds:
            for slot in med.reminders:                 # ← was: med.reminder_time
                if not slot.enabled or slot.time_of_day is None:
                    continue
                rt = slot.time_of_day
                if rt.hour != now_wat.hour:
                    continue
                # fire on the minute, retry for 5 more if the send failed
                if not (0 <= now_wat.minute - rt.minute < 5):
                    continue

                # ← PER-SLOT key. med.id here kills every dose after the first.
                key = f"reminder:v2:{slot.id}:{today.isoformat()}"
                if not _claim(key, settings.REMINDER_DEDUP_TTL_SECONDS):
                    continue

                patient = med.patient
                if patient is None:
                    _release(key)
                    continue

                if not email_service.send_medication_reminder_email(patient, med):
                    _release(key)                      # same key both calls

    except Exception:
        logger.exception("check_and_send_reminders failed")
    finally:
        db.close()


def check_and_complete_medications() -> None:
    """Daily at midnight: finish courses whose end_date has passed."""
    today = datetime.now(WAT).date()
    db = SessionLocal()
    try:
        meds = (
            db.query(Medication)
            .filter(
                Medication.status == MedicationStatus.ACTIVE.value,
                Medication.end_date.isnot(None),
                Medication.end_date <= today,
            )
            .all()
        )

        for med in meds:
            patient = med.patient
            med.status = MedicationStatus.COMPLETED.value   # idempotent: next run won't match
            db.commit()

            if patient is not None:
                email_service.send_medication_completion_email(patient, med)

    except Exception:
        db.rollback()
        logger.exception("check_and_complete_medications failed")
    finally:
        db.close()


# ------------------------------------------------------------- job 3
def check_and_cancel_stale_appointments() -> None:
    """Daily at 8am WAT: cancel PENDING appointments older than N hours."""
    cutoff = utcnow() - timedelta(hours=settings.STALE_APPOINTMENT_HOURS)
    db = SessionLocal()
    try:
        appts = (
            db.query(Appointment)
            .filter(
                Appointment.status == AppointmentStatus.PENDING.value,
                Appointment.created_at < cutoff,
            )
            .all()
        )

        for appt in appts:
            patient = appt.patient
            appt.status = AppointmentStatus.CANCELLED.value
            db.commit()

            if patient is not None:
                email_service.send_appointment_cancelled_email(patient, appt)

    except Exception:
        db.rollback()
        logger.exception("check_and_cancel_stale_appointments failed")
    finally:
        db.close()


# --------------------------------------------------------- lifecycle
def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(check_and_send_reminders, "interval",
                      minutes=1, id="send_reminders",
                      replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(check_and_complete_medications, "cron",
                      hour=0, minute=0, id="complete_medications",
                      replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(check_and_cancel_stale_appointments, "cron",
                      hour=8, minute=0, id="cancel_stale_appointments",
                      replace_existing=True, max_instances=1, coalesce=True)
    scheduler.start()
    logger.info("Scheduler started (timezone=%s)", settings.REMINDER_TIMEZONE)


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")
