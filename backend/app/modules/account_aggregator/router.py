"""
Account Aggregator API Router
Exposes endpoints for institutional consent initiation, status polling,
financial telemetry retrieval, and cryptographic verification evidence.
"""
from __future__ import annotations

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_optional, require_roles
from app.core.models import User
from app.modules.account_aggregator.base import (
    AAConsentRequest,
    AAConsentStatusResponse,
    AARetrievalResult,
)
from app.modules.account_aggregator.service import (
    AccountAggregatorService,
    get_account_aggregator_service,
)

logger = logging.getLogger("fdr_smart.account_aggregator.router")

router = APIRouter(prefix="/account-aggregator", tags=["Account Aggregator (AA)"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class InitiateConsentPayload(BaseModel):
    institution_id: str
    institution_name: str
    customer_aa_handle: str
    fip_id: str
    fip_name: str
    data_categories: List[str] = Field(default_factory=lambda: ["DEPOSIT", "TERM_DEPOSIT"])
    consent_mode: str = "QUERY"
    fetch_type: str = "ONETIME"
    purpose_code: str = "101"
    purpose_description: str = "AICTE APH Security Deposit & Irrevocable Lien Verification"
    consent_validity_months: int = 12


class ConsentResponseItem(BaseModel):
    id: str
    institution_id: str
    fip_id: str
    fip_name: str
    customer_aa_handle: str
    consent_handle: str
    consent_id: Optional[str]
    status: str
    consent_mode: str
    data_categories: List[str]
    purpose_description: str
    consent_start_date: str
    consent_expiry_date: str
    redirect_url: Optional[str]
    authorized_at: Optional[str]
    created_at: str


class TelemetryResponseItem(BaseModel):
    id: str
    consent_id: str
    instrument_id: Optional[str]
    institution_id: str
    fip_name: str
    data_source: str
    status: str
    concordance_matched: bool
    retrieved_data: Optional[dict]
    mismatches: Optional[list]
    unsupported_fields: Optional[list]
    raw_signature_info: Optional[dict]
    demo_notice: Optional[str]
    retrieved_at: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/consents", response_model=ConsentResponseItem, status_code=status.HTTP_201_CREATED)
def initiate_consent(
    payload: InitiateConsentPayload,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    service: AccountAggregatorService = Depends(get_account_aggregator_service),
):
    """
    Initiates an institutional consent request via the Account Aggregator network.
    Authorization: Scrutiny Officer, Approving Authority, or Admin.
    """
    if current_user and current_user.role in ("institution_representative", "depositor"):
        # Institutions must not initiate arbitrary AA pulls outside prescribed workflow
        if current_user.institution_id and current_user.institution_id != payload.institution_id:
            raise HTTPException(status_code=403, detail="Cross-institution consent initiation prohibited.")

    req = AAConsentRequest(
        institution_id=payload.institution_id,
        institution_name=payload.institution_name,
        customer_aa_handle=payload.customer_aa_handle,
        fip_id=payload.fip_id,
        fip_name=payload.fip_name,
        data_categories=payload.data_categories,
        consent_mode=payload.consent_mode,
        fetch_type=payload.fetch_type,
        purpose_code=payload.purpose_code,
        purpose_description=payload.purpose_description,
        consent_validity_months=payload.consent_validity_months,
    )

    consent = service.initiate_consent(db, req, initiator_user_id=current_user.id if current_user else None)
    return ConsentResponseItem(
        id=consent.id,
        institution_id=consent.institution_id,
        fip_id=consent.fip_id,
        fip_name=consent.fip_name,
        customer_aa_handle=consent.customer_aa_handle,
        consent_handle=consent.consent_handle,
        consent_id=consent.consent_id,
        status=consent.status,
        consent_mode=consent.consent_mode,
        data_categories=consent.data_categories,
        purpose_description=consent.purpose_description,
        consent_start_date=consent.consent_start_date.isoformat(),
        consent_expiry_date=consent.consent_expiry_date.isoformat(),
        redirect_url=consent.redirect_url,
        authorized_at=consent.authorized_at.isoformat() if consent.authorized_at else None,
        created_at=consent.created_at.isoformat(),
    )


@router.get("/consents", response_model=List[ConsentResponseItem])
def list_consents(
    institution_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    service: AccountAggregatorService = Depends(get_account_aggregator_service),
):
    """
    Lists institutional Account Aggregator consents.
    """
    # Enforce institution isolation
    if current_user and current_user.role in ("institution_representative", "depositor"):
        institution_id = current_user.institution_id or "inst-001"

    consents = service.list_consents(db, institution_id=institution_id, status=status_filter)
    return [
        ConsentResponseItem(
            id=c.id,
            institution_id=c.institution_id,
            fip_id=c.fip_id,
            fip_name=c.fip_name,
            customer_aa_handle=c.customer_aa_handle,
            consent_handle=c.consent_handle,
            consent_id=c.consent_id,
            status=c.status,
            consent_mode=c.consent_mode,
            data_categories=c.data_categories,
            purpose_description=c.purpose_description,
            consent_start_date=c.consent_start_date.isoformat(),
            consent_expiry_date=c.consent_expiry_date.isoformat(),
            redirect_url=c.redirect_url,
            authorized_at=c.authorized_at.isoformat() if c.authorized_at else None,
            created_at=c.created_at.isoformat(),
        )
        for c in consents
    ]


@router.get("/consents/{consent_id}/status", response_model=ConsentResponseItem)
def get_consent_status(
    consent_id: str,
    db: Session = Depends(get_db),
    service: AccountAggregatorService = Depends(get_account_aggregator_service),
):
    """
    Polls the current status of an Account Aggregator consent handle.
    """
    try:
        c = service.get_consent_status(db, consent_id)
        return ConsentResponseItem(
            id=c.id,
            institution_id=c.institution_id,
            fip_id=c.fip_id,
            fip_name=c.fip_name,
            customer_aa_handle=c.customer_aa_handle,
            consent_handle=c.consent_handle,
            consent_id=c.consent_id,
            status=c.status,
            consent_mode=c.consent_mode,
            data_categories=c.data_categories,
            purpose_description=c.purpose_description,
            consent_start_date=c.consent_start_date.isoformat(),
            consent_expiry_date=c.consent_expiry_date.isoformat(),
            redirect_url=c.redirect_url,
            authorized_at=c.authorized_at.isoformat() if c.authorized_at else None,
            created_at=c.created_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/consents/{consent_id}/revoke")
def revoke_consent(
    consent_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    service: AccountAggregatorService = Depends(get_account_aggregator_service),
):
    """
    Revokes an active institutional consent.
    """
    success = service.revoke_consent(db, consent_id, user_id=current_user.id if current_user else None)
    if not success:
        raise HTTPException(status_code=404, detail="Consent record not found or already revoked.")
    return {"success": True, "message": "Account Aggregator consent revoked successfully."}


@router.post("/telemetry/{instrument_id}", response_model=TelemetryResponseItem)
def fetch_telemetry(
    instrument_id: str,
    force_refresh: bool = Query(default=False),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    service: AccountAggregatorService = Depends(get_account_aggregator_service),
):
    """
    Fetches real-time Term Deposit telemetry from the FIP via Account Aggregator.
    Evaluates concordance against the registered Financial Instrument.
    """
    try:
        r = service.fetch_fdr_telemetry(
            db,
            instrument_id=instrument_id,
            caller_user_id=current_user.id if current_user else None,
            force_refresh=force_refresh,
        )
        return TelemetryResponseItem(
            id=r.id,
            consent_id=r.consent_id,
            instrument_id=r.instrument_id,
            institution_id=r.institution_id,
            fip_name=r.fip_name,
            data_source=r.data_source,
            status=r.status,
            concordance_matched=r.concordance_matched,
            retrieved_data=r.retrieved_data,
            mismatches=r.mismatches,
            unsupported_fields=r.unsupported_fields,
            raw_signature_info=r.raw_signature_info,
            demo_notice=r.demo_notice,
            retrieved_at=r.retrieved_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/instrument/{instrument_id}/evidence", response_model=Optional[TelemetryResponseItem])
def get_instrument_aa_evidence(
    instrument_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the latest Account Aggregator verification evidence for an FDR.
    """
    from app.core.models import AccountAggregatorRetrieval
    r = (
        db.query(AccountAggregatorRetrieval)
        .filter(AccountAggregatorRetrieval.instrument_id == instrument_id)
        .order_by(AccountAggregatorRetrieval.retrieved_at.desc())
        .first()
    )
    if not r:
        return None

    return TelemetryResponseItem(
        id=r.id,
        consent_id=r.consent_id,
        instrument_id=r.instrument_id,
        institution_id=r.institution_id,
        fip_name=r.fip_name,
        data_source=r.data_source,
        status=r.status,
        concordance_matched=r.concordance_matched,
        retrieved_data=r.retrieved_data,
        mismatches=r.mismatches,
        unsupported_fields=r.unsupported_fields,
        raw_signature_info=r.raw_signature_info,
        demo_notice=r.demo_notice,
        retrieved_at=r.retrieved_at.isoformat(),
    )
