"""
FDR-SMART Institutions Module
Manages institution records and authorized lookups.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.models import Institution, FinancialInstrument

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("")
async def list_institutions(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List registered institutions with optional search filtering."""
    query = db.query(Institution)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Institution.name.ilike(search_filter)) |
            (Institution.institution_code.ilike(search_filter)) |
            (Institution.city.ilike(search_filter))
        )
    if status:
        query = query.filter(Institution.status == status)
        
    institutions = query.all()
    
    results = []
    for inst in institutions:
        results.append({
            "id": inst.id,
            "name": inst.name,
            "code": inst.institution_code,
            "type": inst.institution_type or "University",
            "state": inst.state or "",
            "city": inst.city or "",
            "approvedIntake": inst.approved_intake or 0,
            "totalDepositRequired": float(inst.total_deposit_required or 0),
            "status": inst.status,
            "contactEmail": inst.contact_email,
            "contactPhone": inst.contact_phone,
        })
        
    return {
        "success": True,
        "data": results,
        "total": len(results),
    }

@router.get("/{institution_id}")
async def get_institution(institution_id: str, db: Session = Depends(get_db)):
    """Retrieve institution details by ID or code."""
    inst = db.query(Institution).filter(
        (Institution.id == institution_id) | (Institution.institution_code == institution_id)
    ).first()
    
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
        
    instruments = db.query(FinancialInstrument).filter(FinancialInstrument.institution_id == inst.id).all()
    total_active_deposit = sum(float(i.amount) for i in instruments if i.lifecycle_status == "active")

    return {
        "success": True,
        "data": {
            "id": inst.id,
            "name": inst.name,
            "code": inst.institution_code,
            "type": inst.institution_type or "University",
            "state": inst.state or "",
            "city": inst.city or "",
            "address": inst.address,
            "approvedIntake": inst.approved_intake or 0,
            "totalDepositRequired": float(inst.total_deposit_required or 0),
            "totalActiveDeposit": total_active_deposit,
            "instrumentsCount": len(instruments),
            "status": inst.status,
            "contactEmail": inst.contact_email,
            "contactPhone": inst.contact_phone,
        }
    }
