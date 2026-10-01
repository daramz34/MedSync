from database import get_db
from schemas import (MedicationCreate, MedicationResponse, MedicationUpdate)
from crud import (create_medication_manual,get_my_medications,  get_medication_by_id, update_medication, delete_medication)
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException,  Depends, status, Response
from sqlalchemy.orm import Session
from fastapi_cache.decorator import cache
from enums import MedicationStatus, UserRole
from core.limiter import limiter
from core.dependencies import get_current_user
from services.email import send_medication_reminder_email, send_medication_completion_email
from models import User
from types import SimpleNamespace


router = APIRouter(prefix="/medications", tags=["MEDICATIONS"])
def _ctx(obj, *fields):
    """Copy values while the DB session is open for use by a background task."""
    return SimpleNamespace(**{field: getattr(obj, field) for field in fields})


def _value(value):
    """Handle either an enum member or the string stored in the database."""
    return getattr(value, "value", value)

@router.post("/", response_model=MedicationResponse, status_code=201)
@limiter.limit("/5minute")
def create_medications(request: Request, medication: MedicationCreate,db: Session = Depends(get_db),  current_user: User=Depends(get_current_user)):
    db_medications = create_medication_manual(db, medication, current_user)
    return db_medications



@router.get("/", response_model=list[MedicationResponse])
@limiter.limit("30/minute")
def list_my_active_medications(request: Request, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    medications = get_my_medications(db, current_user)
    return [
        medication
        for medication in medications
        if _value(medication.status) == MedicationStatus.ACTIVE.value
    ]


@router.post("/{medication_id}/test-reminder", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/minute")
def test_medication_reminder(request: Request, medication_id: int,background_tasks: BackgroundTasks,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    if _value(current_user.role) != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can test their medication reminders",
        )

    medication = get_medication_by_id(db, medication_id, current_user)
    if medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    background_tasks.add_task(
        send_medication_reminder_email,
        _ctx(current_user, "email", "full_name"),
        _ctx(medication, "drug_name", "dosage", "frequency"),
    )
    return {"detail": "Test reminder email queued"}



@router.get("/{medication_id}", response_model=MedicationResponse)
@limiter.limit("30/minute")
def get_medication_endpoint(request: Request,medication_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    medication = get_medication_by_id(db, medication_id, current_user)
    if medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return medication


@router.patch("/{medication_id}", response_model=MedicationResponse)
@limiter.limit("10/minute")
def update_medication_endpoint(request: Request, medication_id: int,data: MedicationUpdate,background_tasks: BackgroundTasks,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    previous = get_medication_by_id(db, medication_id, current_user)
    if previous is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    was_completed = _value(previous.status) == MedicationStatus.COMPLETED.value
    medication = update_medication(db, medication_id, data, current_user)
    if medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

 
    if (
        data.status is not None
        and _value(data.status) == MedicationStatus.COMPLETED.value
        and not was_completed
    ):
        background_tasks.add_task(
            send_medication_completion_email,
            _ctx(current_user, "email", "full_name"),
            _ctx(medication, "drug_name"),
        )

    return medication


@router.delete("/{medication_id}",status_code=status.HTTP_204_NO_CONTENT,response_class=Response)
@limiter.limit("10/minute")
def delete_medication_endpoint(request: Request, medication_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)) -> Response:
    medication = delete_medication(db, medication_id, current_user)
    if medication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)