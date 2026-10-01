from database import get_db
from schemas import (ClinicStats, DoctorList, PatientList, RegisterDoctor,
                     UserResponse)
from crud import (get_clinic_stats, get_all_patients, get_all_doctors,
                  create_doctor, delete_user, get_user_by_id, get_user_by_email,
                  require_admin)
from fastapi import (APIRouter, BackgroundTasks, Depends, HTTPException,
                     Query, Request, Response, status)
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from core.cache import cache, get_cached_model
from core.limiter import limiter
from services.email import send_doctor_welcome_email

router = APIRouter(
    prefix="/admin",
    tags=["ADMIN"],
    dependencies=[Depends(require_admin)],     # every route below is admin-only
)


# ── STATS (cached 5 min) ──
@router.get("/stats", response_model=ClinicStats)
@limiter.limit("30/minute")
def clinic_stats_endpoint(request: Request, db: Session = Depends(get_db)):
    return get_cached_model("clinic_stats", 300, ClinicStats, lambda: get_clinic_stats(db))


# ── PATIENTS ──
@router.get("/patients", response_model=PatientList)
@limiter.limit("30/minute")
def list_patients_endpoint(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_all_patients(db, page, limit)


# ── DOCTORS ──
@router.get("/doctors", response_model=DoctorList)
@limiter.limit("30/minute")
def list_doctors_endpoint(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_all_doctors(db, page, limit)


@router.post("/doctors", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register_doctor_endpoint(
    request: Request,
    user: RegisterDoctor,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Email already registered")

    try:
        db_doctor = create_doctor(db, data=user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Email already registered")

    background_tasks.add_task(send_doctor_welcome_email, db_doctor)

    # a new doctor changes the doctor lists AND the user totals
    cache.delete_prefix("doctors_list")
    cache.delete_prefix("appointments_doctors_list")
    cache.delete_prefix("clinic_stats")
    return db_doctor


# ── DELETE USER ──
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
@limiter.limit("10/minute")
def remove_user_endpoint(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
) -> Response:
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    delete_user(db, user_id)

    cache.delete_prefix("doctors_list")
    cache.delete_prefix("appointments_doctors_list")
    cache.delete_prefix("clinic_stats")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
