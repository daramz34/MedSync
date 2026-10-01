from database import get_db
from schemas import (PaginatedPrescriptionResponse, PrescriptionCreate, PrescriptionResponse, QRScanResponse, QRScanRequest)
from crud import (create_prescription,revoke_qr, get_prescription_by_id, get_my_prescriptions, scan_qr, ensure_prescription_medications)
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException,  Depends,  Query
from sqlalchemy.orm import Session
from fastapi_cache.decorator import cache

from core.limiter import limiter
from core.dependencies import get_current_user
from services.email import send_prescription_ready_email
from models import User
from types import SimpleNamespace




router = APIRouter(prefix="/prescriptions", tags=["PRESCRIPTIONS"])
def _ctx(obj, *fields):
    """Copy ORM values while the database session is still open."""
    return SimpleNamespace(**{field: getattr(obj, field) for field in fields})

@router.post("/", response_model=PrescriptionResponse, status_code=201)
@limiter.limit("10/minutes")
def create_prescription_endpoint(request: Request, prescription: PrescriptionCreate, background_tasks: BackgroundTasks, db: Session=Depends(get_db),  current_user: User = Depends(get_current_user)):
    db_prescription = create_prescription(db, prescription, current_user)
    background_tasks.add_task(
        send_prescription_ready_email,                      
        _ctx(db_prescription.patient, "email", "full_name"),
        _ctx(db_prescription, "id"),
    )

    return db_prescription


@router.get("/", response_model=PaginatedPrescriptionResponse, status_code=200)
@limiter.limit("30/minutes")
def list_my_prescription(request: Request, page: int= Query(default=1, ge=1), limit: int =Query(default=10, ge=1, le=100), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appointments = get_my_prescriptions(db, current_user, page, limit)
    return appointments





@router.post("/scan", response_model=QRScanResponse)
@limiter.limit("5/minute")
def scan_prescription_endpoint(request: Request,data: QRScanRequest,db: Session = Depends(get_db)):
    prescription = scan_qr(db, data.qr_token, data.password)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Invalid, expired, or revoked QR code")

    created = ensure_prescription_medications(db, prescription)

    return QRScanResponse(
        prescription_id=prescription.id,
        patient=prescription.patient,
        items=prescription.items,
        medications_created=created,
    )

@router.post("/{prescription_id}/revoke-qr", response_model=PrescriptionResponse)
@limiter.limit("10/minute")
def revoke_qr_endpoint(request: Request,prescription_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    prescription = revoke_qr(db, prescription_id, current_user)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
@limiter.limit("30/minute")
def get_prescription_endpoint(request: Request,prescription_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    prescription = get_prescription_by_id(db, prescription_id, current_user)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

