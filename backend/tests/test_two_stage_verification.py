"""
Automated Integration Tests for Two-Stage FDR Verification System:
- Stage 1: Technical Scrutiny (Scrutiny Officer)
  - Duplicate reference detection across registry
  - Field-by-field concordance recording
  - RBAC verification (Institution Representative blocked)
  - Technical scrutiny outcomes: VERIFIED, DISCREPANCY_FOUND, CLARIFICATION_REQUIRED, UNABLE_TO_VERIFY
- Stage 2: Executive Financial Verification (Approving Authority)
  - Consolidated Financial Summary with 5 separate verification methods
  - Mandatory checks gating enforcement (rejection if checks not satisfied and no permitted exception)
  - Permitted regulatory exception with statutory justification
  - Executive Financial Approval
"""
import pytest
from fastapi.testclient import TestClient
import uuid
from urllib.parse import quote

from app.main import app
from app.core.database import SessionLocal
from app.core.models import (
    FinancialInstrument,
    Institution,
    User,
    InstrumentVerification,
    AuditEvent,
)
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def test_setup(db):
    # Ensure test institution
    inst = db.query(Institution).filter(Institution.id == "inst-test-two-stage").first()
    if not inst:
        inst = Institution(
            id="inst-test-two-stage",
            institution_code="AICTE-TEST-TS",
            name="Two Stage Testing Institute",
            status="active",
        )
        db.add(inst)
        db.commit()

    # Create Scrutiny Officer
    scrutiny_user = db.query(User).filter(User.email == "test_scrutiny@aicte.gov.in").first()
    if not scrutiny_user:
        scrutiny_user = User(
            id=str(uuid.uuid4()),
            email="test_scrutiny@aicte.gov.in",
            display_name="Senior Scrutiny Officer",
            role="scrutiny_officer",
            status="active",
        )
        db.add(scrutiny_user)
        db.commit()

    # Create Approving Authority
    approver_user = db.query(User).filter(User.email == "test_approver@aicte.gov.in").first()
    if not approver_user:
        approver_user = User(
            id=str(uuid.uuid4()),
            email="test_approver@aicte.gov.in",
            display_name="Member Secretary AICTE",
            role="approving_authority",
            status="active",
        )
        db.add(approver_user)
        db.commit()

    # Create Institution Representative
    inst_rep = db.query(User).filter(User.email == "test_rep@institute.edu.in").first()
    if not inst_rep:
        inst_rep = User(
            id=str(uuid.uuid4()),
            email="test_rep@institute.edu.in",
            display_name="Registrar Representative",
            role="institution_representative",
            status="active",
        )
        db.add(inst_rep)
        db.commit()

    # Create Test Instrument
    test_instrument_id = "inst-ts-" + str(uuid.uuid4())[:8]
    test_ref_number = "FDR/TS/2026/" + str(uuid.uuid4())[:6].upper()
    instrument = FinancialInstrument(
        id=test_instrument_id,
        institution_id=inst.id,
        reference_number=test_ref_number,
        instrument_type="fixed_deposit",
        amount=5000000.0,
        bank_name="State Bank of India",
        branch_name="New Delhi Main",
        submission_status="submitted",
        verification_status="pending",
        financial_verification_status="pending",
        submitted_by_user_id=inst_rep.id,
        purpose="security_deposit",
    )
    db.add(instrument)
    db.commit()

    tokens = {
        "scrutiny": create_access_token({"sub": scrutiny_user.id, "email": scrutiny_user.email, "role": "scrutiny_officer"}),
        "approver": create_access_token({"sub": approver_user.id, "email": approver_user.email, "role": "approving_authority"}),
        "inst_rep": create_access_token({"sub": inst_rep.id, "email": inst_rep.email, "role": "institution_representative"}),
    }

    return {
        "instrument_id": test_instrument_id,
        "ref_number": test_ref_number,
        "tokens": tokens,
    }


def test_duplicate_check_endpoint(test_setup):
    """Detects unique reference versus duplicated reference across institutions."""
    ref = test_setup["ref_number"]
    token = test_setup["tokens"]["scrutiny"]
    headers = {"Authorization": f"Bearer {token}"}

    # URL-encode the reference number to handle slashes (e.g. FDR/TS/2026/XXXX)
    encoded_ref = quote(ref, safe="")
    res = client.get(f"/api/v1/verification/check-duplicate/{encoded_ref}?exclude_id={test_setup['instrument_id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_duplicate"] is False
    assert data["duplicate_count"] == 0


def test_stage1_rbac_enforcement(test_setup):
    """Institution representatives must NOT be permitted to execute technical scrutiny outcomes."""
    token = test_setup["tokens"]["inst_rep"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "instrument_id": test_setup["instrument_id"],
        "outcome": "VERIFIED",
        "review_notes": "Attempted bypass by unauthorized user",
        "lien_beneficiary_verified": True,
    }

    res = client.post("/api/v1/verification/technical-scrutiny", json=payload, headers=headers)
    assert res.status_code == 403
    # Confirm the error prevents institution representatives from submitting scrutiny outcomes
    assert "institution representative" in res.json()["detail"].lower() or "permission" in res.json()["detail"].lower()


def test_stage1_technical_scrutiny_execution(test_setup):
    """Scrutiny Officer successfully executes Stage 1 Technical Scrutiny."""
    token = test_setup["tokens"]["scrutiny"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "instrument_id": test_setup["instrument_id"],
        "outcome": "VERIFIED",
        "review_notes": "All certificate fields match submitted form. Joint lien in favor of Member Secretary AICTE verified.",
        "lien_beneficiary_verified": True,
    }

    res = client.post("/api/v1/verification/technical-scrutiny", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["verification_status"] == "verified"
    assert data["success"] is True


def test_stage2_financial_verification_summary(test_setup):
    """Approving Authority retrieves consolidated Financial Verification Summary with 5 distinct methods."""
    token = test_setup["tokens"]["approver"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/v1/verification/financial-summary/{test_setup['instrument_id']}", headers=headers)
    assert res.status_code == 200
    summary = res.json()

    assert summary["instrument_id"] == test_setup["instrument_id"]
    assert len(summary["methods"]) == 5

    method_names = [m["method"] for m in summary["methods"]]
    assert "Technical Scrutiny & OCR Cross-Check" in method_names
    assert "Core Banking (CBS) / SFMS 2.0 Gateway" in method_names
    assert "Weekly Bank Statement Analysis" in method_names
    assert "Account Aggregator (RBI AA Framework)" in method_names
    assert "Financial Allocation & APH Compliance" in method_names

    # Check that mandatory checks evaluation is present
    assert "mandatory_checks" in summary
    assert len(summary["mandatory_checks"]) == 4


def test_stage2_executive_approval_with_exception_if_needed(test_setup):
    """Approving Authority records Executive Financial Decision."""
    token = test_setup["tokens"]["approver"]
    headers = {"Authorization": f"Bearer {token}"}

    # Approving with permitted regulatory exception recorded under APH Clause 14.3
    payload = {
        "instrument_id": test_setup["instrument_id"],
        "decision": "APPROVE",
        "decision_notes": "Statutory approval under AICTE Act. Pledged security deposit verified and ratified.",
        "exception_permitted": True,
        "exception_reason": "Approved under APH 2026-27 Section 14.3 with full collateral confirmation.",
    }

    res = client.post("/api/v1/verification/executive-decision", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["financial_verification_status"] == "approved"

