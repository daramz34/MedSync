from database import get_db
from schemas import DrugResponse
from crud import get_or_fetch_drug, get_drug_by_id, search_drug_references
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from models import DrugReference
from core.cache import cache
from core.limiter import limiter

router = APIRouter(prefix="/drugs", tags=["DRUGS"])


@router.get("/search", response_model=list[DrugResponse])
@limiter.limit("30/minute")
def search_drug_endpoint(
    request: Request,
    name: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    normalized = name.strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="Provide a drug name")

    # Treat % and _ in the input literally instead of as SQL wildcards.
    escaped = normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"{escaped}%"

    # 1. local prefix match — no openFDA call when we already know the drug
    local =     local = search_drug_references(db, normalized)

    if local:
        return local

    # 2. only now touch openFDA, still behind the 24 h exact-query cache
    return cache.get_or_set(
        f"drug:{normalized}",
        86400,
        lambda: get_or_fetch_drug(db, normalized),
    )


@router.get("/{drug_id}", response_model=DrugResponse)
@limiter.limit("30/minute")
def get_drug_endpoint(
    request: Request,
    drug_id: int,
    db: Session = Depends(get_db),
):
    drug = get_drug_by_id(db, drug_id)
    if drug is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drug not found",
        )
    return drug
