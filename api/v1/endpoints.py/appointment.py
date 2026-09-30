from database import get_db
from schemas import (AppointmentCreate, PrescriptionResponse, PaginatedAppointmentResponse, AppointmentResponse, AppointmentUpdate, DoctorList)
from crud import (create_appointment, get_prescription_by_appointment, get_my_appointments, get_appointment_by_id, update_appointment, cancel_appointment, get_all_doctors)
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException, status, Depends, Response, Query
from sqlalchemy.orm import Session
from enums import AppointmentStatus
from core.limiter import limiter
from core.dependencies import get_current_user
from services.email import send_appointment_booked_email, send_appointment_status_email,send_appointment_cancelled_doctor_email
from models import User
from types import SimpleNamespace
from core.cache import cache, get_cached_model



router = APIRouter(prefix="/appointments", tags=["APPOINTMENT"])

def _ctx(obj, *fields):
    """Snapshot ORM attributes while the session is open — safe to use later."""
    return SimpleNamespace(**{f: getattr(obj, f) for f in fields})

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_appointment_endpoint(request: Request, appointment: AppointmentCreate, background_tasks: BackgroundTasks, db: Session=Depends(get_db),  current_user: User = Depends(get_current_user)):
    db_appointment = create_appointment(db, appointment, current_user)
    background_tasks.add_task(
        send_appointment_booked_email,                                   # → doctor
        _ctx(db_appointment.doctor, "email", "full_name"),
        _ctx(current_user, "full_name"),
        _ctx(db_appointment, "appointment_date", "appointment_time", "reason"),
    )
    cache.delete_prefix("clinic_stats")
    return db_appointment

@router.get("/", response_model=PaginatedAppointmentResponse, status_code=200)
@limiter.limit("30/minute")
def list_my_appointments(request: Request, status_filter: AppointmentStatus| None = Query(default=None, alias="status"),page: int= Query(default=1, ge=1), limit: int =Query(default=10, ge=1, le=100), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appointments = get_my_appointments(db, current_user, page, limit, status_filter)
    return appointments


@router.get("/doctors", response_model=DoctorList)
@limiter.limit("30/minute")
def get_all_doctors_endpoint(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_cached_model(
        f"appointments_doctors_list:{page}:{limit}",
        600,
        DoctorList,
        lambda: get_all_doctors(db, page, limit),
    )



@router.get("/{appointment_id}", response_model=AppointmentResponse, status_code=200)
@limiter.limit("30/minute")
def get_appointment_by_id_endpoint(request: Request, appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appointment = get_appointment_by_id(db, appointment_id, current_user)
    if not appointment:
            raise HTTPException(status_code=404, detail="No appointments found")
        
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentResponse, status_code=200)
@limiter.limit("30/minute")
def update_appointments_endpoint(request: Request,appointment_id: int, update :AppointmentUpdate,background_tasks: BackgroundTasks, db: Session= Depends(get_db), current_user: User=Depends(get_current_user)):
    appointment= update_appointment(db, appointment_id, update, current_user)

    if update.status is not None:                # only email when a status was sent
        background_tasks.add_task(
            send_appointment_status_email,                               # → patient
            _ctx(appointment.patient, "email", "full_name"),
            _ctx(appointment, "appointment_date", "appointment_time", "reason"),
            _ctx(appointment.doctor, "full_name"),
            update.status.value,
        )
    cache.delete_prefix("clinic_stats")
    return appointment

@router.delete("/{appointment_id}", status_code=204, response_class=Response)
@limiter.limit("5/minute")
def cancel_appoitment(request: Request,appointment_id: int, background_tasks: BackgroundTasks, db: Session= Depends(get_db), current_user: User=Depends(get_current_user))-> Response:
    appointment = cancel_appointment(db, appointment_id, current_user)
    background_tasks.add_task(
        send_appointment_cancelled_doctor_email,                         # → doctor
        _ctx(appointment.doctor, "email", "full_name"),
        _ctx(current_user, "full_name"),
        _ctx(appointment, "appointment_date", "appointment_time", "reason"),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/{appointment_id}/prescription", response_model=PrescriptionResponse)
@limiter.limit("30/minute")
def get_prescription_by_appointment_endpoint(
    request: Request,
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prescription = get_prescription_by_appointment(db, appointment_id, current_user)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription