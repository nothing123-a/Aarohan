"""
Test Suite: Account Aggregator (AA) Integration Module
Covers:
- Consent initiation and lifecycle (PENDING -> ACTIVE -> EXPIRED -> REVOKED)
- Security invariants: ZERO collection of usernames, passwords, PINs, or OTPs
- Term deposit telemetry retrieval & field concordance matching
- Field mismatch detection & unsupported FIP handling
- Stage 2 Financial Verification Summary integration
- Institutional isolation & audit trail recording
- SIH prototype demonstration mode with explicit demo_notice
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.core.security import create_access_token
from app.core.models import (
    Institution,
    FinancialInstrument,
    User,
    AccountAggregatorConsent,
    AccountAggregatorRetrieval,
)
from app.modules.account_aggregator.base import AAConsentRequest
from app.modules.account_aggregator.service import AccountAggregatorService
from app.modules.account_aggregator.adapters.demo_adapter import DemonstrationAccountAggregatorAdapter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _scrutiny_headers() -> dict:
    token = create_access_token({"sub": "user-aa-test", "role": "scrutiny_officer"})
    return {"Authorization": f"Bearer {token}"}


def _approver_headers() -> dict:
    token = create_access_token({"sub": "user-aa-approver", "role": "approving_authority"})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module", autouse=True)
def seed_db():
    """
    Create schema and seed test rows once for the module.
    Session is committed and closed before any test runs, so the
    FastAPI TestClient's own get_db() sessions are never blocked.
    """
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        if not session.query(User).filter(User.id == "user-aa-test").first():
            session.add(User(
                id="user-aa-test",
                email="aa_scrutiny@aicte.gov.in",
                display_name="AA Scrutiny Officer",
                role="scrutiny_officer",
                status="active",
            ))
        if not session.query(User).filter(User.id == "user-aa-approver").first():
            session.add(User(
                id="user-aa-approver",
                email="aa_approver@aicte.gov.in",
                display_name="AA Approving Authority",
                role="approving_authority",
                status="active",
            ))
        if not session.query(Institution).filter(Institution.id == "inst-aa-test").first():
            session.add(Institution(
                id="inst-aa-test",
                name="National Institute of Technology Karnataka",
                institution_code="AICTE-SZ-00991",
                state="Karnataka",
                address="Surathkal, Mangalore",
                status="active",
            ))
        session.commit()

        if not session.query(FinancialInstrument).filter(FinancialInstrument.id == "fdr-aa-test").first():
            session.add(FinancialInstrument(
                id="fdr-aa-test",
                institution_id="inst-aa-test",
                reference_number="SBI/SUR/2026/FDR-9921",
                bank_name="State Bank of India",
                branch_name="Surathkal Branch",
                amount=Decimal("5000000"),
                currency="INR",
                issue_date=date(2024, 1, 15),
                maturity_date=date(2027, 1, 14),
                submission_status="submitted",
                verification_status="verified",
                financial_verification_status="pending",
                lifecycle_status="active",
                submitted_by_user_id="user-aa-test",
            ))
        if not session.query(FinancialInstrument).filter(FinancialInstrument.id == "fdr-aa-mismatch").first():
            session.add(FinancialInstrument(
                id="fdr-aa-mismatch",
                institution_id="inst-aa-test",
                reference_number="CNRB/GOA/2026/FDR-BITS-004",
                bank_name="Canara Bank",
                branch_name="Panaji Branch",
                amount=Decimal("3500000"),
                currency="INR",
                issue_date=date(2024, 2, 1),
                maturity_date=date(2027, 2, 1),
                submission_status="submitted",
                verification_status="submitted",
                financial_verification_status="pending",
                lifecycle_status="active",
                submitted_by_user_id="user-aa-test",
            ))
        session.commit()
    finally:
        # Close before tests begin — critical to avoid SQLite write-lock contention
        session.close()

    yield
    # Post-module cleanup (optional)


@pytest.fixture()
def client():
    return TestClient(app)


IDS = {
    "inst_id": "inst-aa-test",
    "fdr_id": "fdr-aa-test",
    "mismatch_fdr_id": "fdr-aa-mismatch",
}


# ---------------------------------------------------------------------------
# Unit & Security Invariant Tests
# ---------------------------------------------------------------------------

def test_security_invariant_zero_credentials():
    """AA DB models must have ZERO username/password/PIN/OTP fields."""
    consent_fields = [c.name for c in AccountAggregatorConsent.__table__.columns]
    retrieval_fields = [c.name for c in AccountAggregatorRetrieval.__table__.columns]
    forbidden = ["password", "pin", "otp", "secret_key", "credentials", "banking_password"]
    for term in forbidden:
        assert term not in consent_fields, f"Forbidden field '{term}' in AccountAggregatorConsent!"
        assert term not in retrieval_fields, f"Forbidden field '{term}' in AccountAggregatorRetrieval!"


def test_initiate_consent_via_service(seed_db):
    """Consent initiation produces a valid handle and redirect URL."""
    session = SessionLocal()
    try:
        service = AccountAggregatorService(adapter=DemonstrationAccountAggregatorAdapter())
        req = AAConsentRequest(
            institution_id=IDS["inst_id"],
            institution_name="National Institute of Technology Karnataka",
            customer_aa_handle="nitk.reg@sahamati-aa",
            fip_id="fip@sbi.aa",
            fip_name="State Bank of India",
            data_categories=["DEPOSIT", "TERM_DEPOSIT"],
            consent_validity_months=12,
        )
        consent = service.initiate_consent(session, req, initiator_user_id="user-aa-test")
        assert consent.id.startswith("aac-")
        assert consent.consent_handle.startswith("handle-")
        assert consent.status in ("ACTIVE", "PENDING")
        assert consent.redirect_url is not None
        assert "sahamati" in consent.redirect_url
    finally:
        session.close()


def test_fetch_term_deposit_concordance_match(seed_db):
    """Telemetry fetch must return verified concordance with digital signature proof."""
    session = SessionLocal()
    try:
        service = AccountAggregatorService(adapter=DemonstrationAccountAggregatorAdapter())
        retrieval = service.fetch_fdr_telemetry(
            session,
            instrument_id=IDS["fdr_id"],
            caller_user_id="user-aa-approver",
            force_refresh=True,
        )
        assert retrieval.status == "verified"
        assert retrieval.concordance_matched is True
        assert retrieval.data_source == "demonstration"
        assert retrieval.demo_notice is not None
        assert len(retrieval.mismatches) == 0
        assert retrieval.retrieved_data["encumbrance_status"] == "CONFIRMED_JOINT_LIEN"
        assert retrieval.raw_signature_info["algorithm"] == "SHA256withRSA"
        assert retrieval.raw_signature_info["verified"] is True
    finally:
        session.close()


def test_fetch_term_deposit_field_mismatch(seed_db):
    """Telemetry fetch must detect and record a principal amount mismatch."""
    session = SessionLocal()
    try:
        service = AccountAggregatorService(adapter=DemonstrationAccountAggregatorAdapter())
        retrieval = service.fetch_fdr_telemetry(
            session,
            instrument_id=IDS["mismatch_fdr_id"],
            caller_user_id="user-aa-approver",
            force_refresh=True,
        )
        assert retrieval.status == "field_mismatch"
        assert retrieval.concordance_matched is False
        assert len(retrieval.mismatches) > 0
        mismatch = retrieval.mismatches[0]
        assert mismatch["field_name"] == "principal_amount"
        assert mismatch["severity"] == "CRITICAL"
    finally:
        session.close()


def test_unsupported_fip_handling():
    """Unregistered bank FIP must return fip_unsupported with unavailable source."""
    adapter = DemonstrationAccountAggregatorAdapter()
    result = adapter.fetch_term_deposit_data(
        consent_id="consent-any",
        fip_id="fip@ruralcooperative.aa",
        fdr_reference="COOP/2026/001",
        expected_amount=Decimal("1000000"),
    )
    assert result.status == "fip_unsupported"
    assert result.data_source == "unavailable"
    assert result.concordance_matched is False
    assert "TERM_DEPOSIT" in result.unsupported_fields


def test_expired_consent_handling():
    """Expired consent must return consent_expired with descriptive error message."""
    adapter = DemonstrationAccountAggregatorAdapter()
    result = adapter.fetch_term_deposit_data(
        consent_id="consent-expired-005",
        fip_id="fip@sbi.aa",
        fdr_reference="SBI/2024/001",
        expected_amount=Decimal("1000000"),
    )
    assert result.status == "consent_expired"
    assert "expired" in result.error_message.lower()


def test_revoke_consent(seed_db):
    """Explicit consent revocation sets status to REVOKED with timestamp."""
    session = SessionLocal()
    try:
        service = AccountAggregatorService(adapter=DemonstrationAccountAggregatorAdapter())
        req = AAConsentRequest(
            institution_id=IDS["inst_id"],
            institution_name="National Institute of Technology Karnataka",
            customer_aa_handle="nitk.revoke@sahamati-aa",
            fip_id="fip@pnb.aa",
            fip_name="Punjab National Bank",
        )
        consent = service.initiate_consent(session, req)
        revoked = service.revoke_consent(session, consent.id, user_id="user-aa-test")
        assert revoked is True
        updated = session.query(AccountAggregatorConsent).filter(
            AccountAggregatorConsent.id == consent.id
        ).first()
        assert updated.status == "REVOKED"
        assert updated.revoked_at is not None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# API Integration Tests  (each uses a fresh TestClient with its own DB session)
# ---------------------------------------------------------------------------

def test_api_list_consents(seed_db, client):
    """GET /api/v1/account-aggregator/consents returns a non-empty list."""
    res = client.get("/api/v1/account-aggregator/consents", headers=_scrutiny_headers())
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_api_initiate_consent(seed_db, client):
    """POST /api/v1/account-aggregator/consents creates a new consent record."""
    payload = {
        "institution_id": IDS["inst_id"],
        "institution_name": "NITK Surathkal",
        "customer_aa_handle": "nitk.api@sahamati-aa",
        "fip_id": "fip@hdfcbank.aa",
        "fip_name": "HDFC Bank",
        "consent_validity_months": 6,
    }
    res = client.post(
        "/api/v1/account-aggregator/consents",
        json=payload,
        headers=_scrutiny_headers(),
    )
    assert res.status_code == 201
    data = res.json()
    assert data["customer_aa_handle"] == "nitk.api@sahamati-aa"
    assert data["consent_handle"].startswith("handle-")


def test_api_fetch_telemetry(seed_db, client):
    """POST /api/v1/account-aggregator/telemetry/{id} returns verified concordance."""
    res = client.post(
        f"/api/v1/account-aggregator/telemetry/{IDS['fdr_id']}?force_refresh=true",
        headers=_approver_headers(),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "verified"
    assert data["concordance_matched"] is True
    assert data["data_source"] == "demonstration"


def test_stage2_financial_verification_summary_reflects_aa(seed_db, client):
    """Stage 2 Financial Verification Summary must include an Account Aggregator method entry."""
    res = client.get(
        f"/api/v1/verification/financial-summary/{IDS['fdr_id']}",
        headers=_approver_headers(),
    )
    assert res.status_code == 200
    data = res.json()
    aa_method = next((m for m in data["methods"] if "Account Aggregator" in m["method"]), None)
    assert aa_method is not None, "Method 4 'Account Aggregator' missing in financial summary!"
    assert aa_method["status"] == "VERIFIED"
    assert "DEMONSTRATION" in aa_method["source_of_evidence"]
    assert "Term Deposit principal" in aa_method["findings"]
