"""Medication reminder endpoints."""
from datetime import time
from crud import _doses_per_day
from models import MedicationReminder
from schemas import MedicationRemindersUpdate, MedicationResponse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.limiter import limiter
from database import get_db
from models import Medication, User
from services.email import send_medication_reminder_email

router = APIRouter(prefix="/reminders", tags=["REMINDERS"])


class TestReminderRequest(BaseModel):
    medication_id: int


@router.post("/test-reminder")
@limiter.limit("5/minute")
def send_test_reminder_endpoint(
    request: Request,
    payload: TestReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a real reminder email right now, so delivery can be verified.

    Deliberately ignores reminder_enabled and reminder_time — this is a test,
    and the point is to prove the email path works at all.
    """
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == payload.medication_id,
            Medication.patient_id == current_user.id,
        )
        .first()
    )
    if medication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found",
        )

    # Synchronous on purpose: the caller needs to know whether it really sent.
    # A BackgroundTask would return before we knew the result.
    sent = send_medication_reminder_email(current_user, medication)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not send the email. Check SMTP_USERNAME / SMTP_PASSWORD "
                "and make sure SMTP_PASSWORD is a Gmail App Password."
            ),
        )

    return {"sent": True, "to": current_user.email, "medication": medication.drug_name}
@router.put("/{medication_id}", response_model=MedicationResponse)
def set_reminders_endpoint(
    medication_id: int,
    data: MedicationRemindersUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace a medication's reminder times (one per daily dose)."""
    medication = (
        db.query(Medication)
        .filter(Medication.id == medication_id, Medication.patient_id == current_user.id)
        .first()
    )
    if medication is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medication not found")

    allowed = _doses_per_day(medication.frequency)
    if len(data.times) > allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"This medication has {allowed} dose{'s' if allowed > 1 else ''} a day, "
            f"so it can have at most {allowed} reminder time{'s' if allowed > 1 else ''}.",
        )

    seen = set()
    clean = []
    for item in data.times:
        t = item.time_of_day.replace(second=0, microsecond=0)
        if t in seen:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Each reminder needs a different time")
        seen.add(t)
        clean.append((t, item.label, item.enabled))

    # Delete first, flush, then insert (the table has a unique (medication, time) rule)
    db.query(MedicationReminder).filter(
        MedicationReminder.medication_id == medication.id
    ).delete(synchronize_session=False)
    db.flush()

    for t, label, enabled in clean:
        db.add(MedicationReminder(
            medication_id=medication.id, time_of_day=t, label=label, enabled=enabled,
        ))

    medication.reminder_enabled = data.enabled
    medication.reminder_time = clean[0][0] if clean else None   # keeps the old field in sync
    db.commit()
    db.expire(medication, ["reminders"])
    db.refresh(medication)
    return medication