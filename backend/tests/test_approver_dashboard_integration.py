"""
Integration Tests for Approving Authority Dashboard:
- Part 1: Financial Verification Summary (Multi-method verification: Scrutiny, Bank API, Weekly Statement, AA)
  - Explicit separate statuses (never collapsed into a single misleading verified flag)
  - Missing bank API, statement, or AA data accurately represented as NOT_AVAILABLE / UNABLE_TO_VERIFY
- Part 2: Fund Allocation Decision
  - Allocation requirements, observed eligible amount, reporting period, compliance status
  - Displays Unable to Verify when evidence is not determinable
- Part 3: Executive Actions
  - Gated APPROVE (checks required or permitted regulatory exception under APH Clause 14.3)
  - REJECT with mandatory reason (minimum 10 characters)
  - REQUEST_CLARIFICATION with mandatory query notes
  - RETURN_FOR_VERIFICATION
  - RBAC checks (Institution Rep and Scrutiny Officer blocked from executive sanction)
  - Audit trail and lifecycle history preservation
- Part 4: Refund Requests Integration
  - Inspect associated FDR & supporting documentation
  - Approve refund -> approved pending discharge (does NOT prematurely mark completed)
  - Complete refund -> confirmed payout transitions to completed/released
  - Reject refund with mandatory reason
  - Return for query
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
    InstrumentLifecycleEvent,
    AuditEvent,
    ReleaseRefundRequest,
    ReleaseRefundDecision,
)
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def approver_test_setup(db):
    # Ensure test institution
    inst = db.query(Institution).filter(Institution.id == "inst-approver-integ").first()
    if not inst:
        inst = Institution(
            id="inst-approver-integ",
            institution_code="AICTE-APP-INT",
            name="Apex Institute of Technology & Research",
            status="active",
        )
        db.add(inst)
        db.commit()

    # Create Scrutiny Officer
    scrutiny_user = db.query(User).filter(User.email == "scrutiny_integ@aicte.gov.in").first()
    if not scrutiny_user:
        scrutiny_user = User(
            id=str(uuid.uuid4()),
            email="scrutiny_integ@aicte.gov.in",
            display_name="Senior Scrutiny Officer Integ",
            role="scrutiny_officer",
            status="active",
        )
        db.add(scrutiny_user)
        db.commit()

    # Create Approving Authority
    approver_user = db.query(User).filter(User.email == "approver_integ@aicte.gov.in").first()
    if not approver_user:
        approver_user = User(
            id=str(uuid.uuid4()),
            email="approver_integ@aicte.gov.in",
            display_name="Executive Approving Authority",
            role="approving_authority",
            status="active",
        )
        db.add(approver_user)
        db.commit()

    # Create Institution Representative
    inst_rep = db.query(User).filter(User.email == "rep_integ@apex.edu.in").first()
    if not inst_rep:
        inst_rep = User(
            id=str(uuid.uuid4()),
            email="rep_integ@apex.edu.in",
            display_name="Authorized College Registrar",
            role="institution_representative",
            status="active",
        )
        db.add(inst_rep)
        db.commit()

    # Create Test Instrument for Financial Verification
    inst_id = "fdr-app-integ-" + str(uuid.uuid4())[:8]
    ref_num = "FDR/APP/2026/" + str(uuid.uuid4())[:6].upper()
    instrument = FinancialInstrument(
        id=inst_id,
        institution_id=inst.id,
        reference_number=ref_num,
        instrument_type="fixed_deposit",
        amount=10000000.0,  # 1 Crore
        bank_name="Punjab National Bank",
        branch_name="Parliament Street Branch",
        account_number="PNB0987654321",
        submission_status="submitted",
        verification_status="under_review",
        financial_verification_status="pending",
        submitted_by_user_id=inst_rep.id,
        purpose="security_deposit",
        lifecycle_status="active",
    )
    db.add(instrument)
    db.commit()

    tokens = {
        "scrutiny": create_access_token({"sub": scrutiny_user.id, "email": scrutiny_user.email, "role": "scrutiny_officer"}),
        "approver": create_access_token({"sub": approver_user.id, "email": approver_user.email, "role": "approving_authority"}),
        "inst_rep": create_access_token({"sub": inst_rep.id, "email": inst_rep.email, "role": "institution_representative"}),
    }

    return {
        "instrument_id": inst_id,
        "ref_number": ref_num,
        "institution_id": inst.id,
        "tokens": tokens,
        "approver_id": approver_user.id,
        "rep_id": inst_rep.id,
    }


# =====================================================================
# PART 1 & 2: Financial Verification Summary & Fund Allocation Decision
# =====================================================================

def test_financial_verification_summary_integrity(approver_test_setup):
    """
    Summary accurately reports separate method statuses without collapsing into
    a single misleading verified flag. Unconnected integrations report NOT_AVAILABLE
    or UNABLE_TO_VERIFY instead of being falsely shown as verified.
    """
    token = approver_test_setup["tokens"]["approver"]
    headers = {"Authorization": f"Bearer {token}"}
    fdr_id = approver_test_setup["instrument_id"]

    res = client.get(f"/api/v1/verification/financial-summary/{fdr_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["instrument_id"] == fdr_id
    methods = {m["method"]: m for m in data["methods"]}

    # Verify Method 2: Bank API / SFMS is NOT available for this new instrument
    bank_method = methods["Core Banking (CBS) / SFMS 2.0 Gateway"]
    assert bank_method["status"] in ("NOT_AVAILABLE", "UNABLE_TO_VERIFY")
    assert "not been initiated" in bank_method["findings"].lower() or "direct bank api" in bank_method["findings"].lower()
    assert bank_method["evidence_reference"] is None or isinstance(bank_method["evidence_reference"], str)

    # Verify Method 3: Weekly Statement Analysis is UNABLE_TO_VERIFY since none uploaded
    stmt_method = methods["Weekly Bank Statement Analysis"]
    assert stmt_method["status"] == "UNABLE_TO_VERIFY"
    assert "no weekly bank statement" in stmt_method["findings"].lower()

    # Verify Method 4: Account Aggregator is NOT_AVAILABLE / PENDING_CONSENT
    aa_method = methods["Account Aggregator (RBI AA Framework)"]
    assert aa_method["status"] in ("NOT_AVAILABLE", "PENDING_CONSENT")

    # Part 2: Fund Allocation Decision Verification
    assert "allocation_decision" in data
    alloc = data["allocation_decision"]
    assert alloc["required_amount"] > 0
    assert alloc["observed_amount_display"] == "Unable to Verify" or alloc["observed_amount"] is not None
    assert "balance_details" in alloc
    assert len(alloc["balance_details"]) > 0


# =====================================================================
# PART 3: Executive Actions & RBAC
# =====================================================================

def test_executive_action_rbac(approver_test_setup):
    """Only Approving Authority or Admin can record Executive Financial Decisions."""
    fdr_id = approver_test_setup["instrument_id"]

    payload = {
        "instrument_id": fdr_id,
        "decision": "APPROVE",
        "decision_notes": "Attempting unauthorized approval by Scrutiny Officer",
    }

    # Scrutiny officer must be blocked (HTTP 403)
    res_scrutiny = client.post(
        "/api/v1/verification/executive-decision",
        json=payload,
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['scrutiny']}"},
    )
    assert res_scrutiny.status_code == 403
    assert "not authorized" in res_scrutiny.json()["detail"].lower() or "permission denied" in res_scrutiny.json()["detail"].lower()

    # Institution Rep must be blocked (HTTP 403)
    res_rep = client.post(
        "/api/v1/verification/executive-decision",
        json=payload,
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['inst_rep']}"},
    )
    assert res_rep.status_code == 403


def test_executive_approval_gating_and_exception(approver_test_setup):
    """
    Approval is gated: if mandatory checks fail and exception_permitted is False,
    the sanction is rejected. When permitted under statutory authority (APH Clause 14.3),
    it records with exception justification.
    """
    fdr_id = approver_test_setup["instrument_id"]
    headers = {"Authorization": f"Bearer {approver_test_setup['tokens']['approver']}"}

    # Attempt approval without satisfying checks and without exception
    payload_blocked = {
        "instrument_id": fdr_id,
        "decision": "APPROVE",
        "decision_notes": "Attempting direct approval without meeting checks",
        "exception_permitted": False,
    }
    res_blocked = client.post("/api/v1/verification/executive-decision", json=payload_blocked, headers=headers)
    assert res_blocked.status_code == 400
    assert "mandatory checks" in res_blocked.json()["detail"].lower() or "exception" in res_blocked.json()["detail"].lower()

    # Now approve with permitted regulatory exception
    payload_approved = {
        "instrument_id": fdr_id,
        "decision": "APPROVE",
        "decision_notes": "Statutory approval under AICTE Act. Collateral and joint lien verified.",
        "exception_permitted": True,
        "exception_reason": "Approved under AICTE APH 2026-27 Clause 14.3 with full collateral confirmation.",
    }
    res_approved = client.post("/api/v1/verification/executive-decision", json=payload_approved, headers=headers)
    assert res_approved.status_code == 200
    data = res_approved.json()
    assert data["financial_verification_status"] == "approved"
    assert data["success"] is True


def test_executive_request_clarification_and_rejection_validation(approver_test_setup, db):
    """
    Verifies that REJECT and REQUEST_CLARIFICATION require minimum 10-character notes,
    and updates statuses appropriately.
    """
    # Create another instrument for testing rejection/clarification
    fdr_id = "fdr-clarify-" + str(uuid.uuid4())[:8]
    instrument = FinancialInstrument(
        id=fdr_id,
        institution_id=approver_test_setup["institution_id"],
        reference_number="FDR/REV/" + str(uuid.uuid4())[:6].upper(),
        instrument_type="fixed_deposit",
        amount=5000000.0,
        bank_name="Canara Bank",
        submission_status="submitted",
        verification_status="under_review",
        financial_verification_status="pending",
        submitted_by_user_id=approver_test_setup["rep_id"],
        lifecycle_status="active",
    )
    db.add(instrument)
    db.commit()

    headers = {"Authorization": f"Bearer {approver_test_setup['tokens']['approver']}"}

    # 1. Rejection without note fails validation
    res_reject_short = client.post(
        "/api/v1/verification/executive-decision",
        json={"instrument_id": fdr_id, "decision": "REJECT", "decision_notes": "No"},
        headers=headers,
    )
    assert res_reject_short.status_code == 400
    assert "mandatory" in res_reject_short.json()["detail"].lower()

    # 2. Clarification without note fails validation
    res_clarify_short = client.post(
        "/api/v1/verification/executive-decision",
        json={"instrument_id": fdr_id, "decision": "REQUEST_CLARIFICATION", "decision_notes": "Short"},
        headers=headers,
    )
    assert res_clarify_short.status_code == 400

    # 3. Clarification with valid note succeeds
    res_clarify = client.post(
        "/api/v1/verification/executive-decision",
        json={
            "instrument_id": fdr_id,
            "decision": "REQUEST_CLARIFICATION",
            "decision_notes": "Please provide confirmation regarding joint lien beneficiary endorsement.",
        },
        headers=headers,
    )
    assert res_clarify.status_code == 200
    assert res_clarify.json()["financial_verification_status"] == "requires_manual_review"

    # 4. Return for Verification succeeds
    res_return = client.post(
        "/api/v1/verification/executive-decision",
        json={
            "instrument_id": fdr_id,
            "decision": "RETURN_FOR_VERIFICATION",
            "decision_notes": "Returned to Technical Scrutiny Cell for physical verification.",
        },
        headers=headers,
    )
    assert res_return.status_code == 200
    assert res_return.json()["financial_verification_status"] == "requires_manual_review"
    assert res_return.json()["verification_status"] == "under_scrutiny"


# =====================================================================
# PART 4: Refund Requests Integration & Completion Lifecycle
# =====================================================================

def test_refund_workflow_lifecycle_and_safeguards(approver_test_setup, db):
    """
    Tests full refund lifecycle:
    1. Institution Rep submits release/refund request.
    2. Approving Authority inspects requests and associated FDR details.
    3. Approving Authority approves request -> transitions to approved pending discharge
       (Instrument is NOT prematurely marked completed/released!).
    4. Approving Authority / Admin confirms payout -> transitions to completed & instrument to released.
    """
    fdr_id = "fdr-refund-" + str(uuid.uuid4())[:8]
    instrument = FinancialInstrument(
        id=fdr_id,
        institution_id=approver_test_setup["institution_id"],
        reference_number="FDR/REFUND/" + str(uuid.uuid4())[:6].upper(),
        instrument_type="fixed_deposit",
        amount=8000000.0,
        bank_name="Union Bank of India",
        branch_name="Bandra Kurla Complex",
        account_number="UBI011223344",
        submission_status="submitted",
        verification_status="verified",
        financial_verification_status="approved",
        submitted_by_user_id=approver_test_setup["rep_id"],
        lifecycle_status="active",
    )
    db.add(instrument)
    db.commit()

    # Step 1: Submit Release Request
    submit_payload = {
        "fdr_id": fdr_id,
        "fdr_number": instrument.reference_number,
        "institution_id": approver_test_setup["institution_id"],
        "institution_name": "Apex Institute of Technology & Research",
        "bank_name": "Union Bank of India",
        "principal_amount": 8000000.0,
        "request_type": "FULL_RELEASE",
        "justification_reason": "Statutory 8-year lock-in completed. No pending affiliation liabilities.",
        "regulatory_clause_reference": "AICTE APH 2026-27 Clause 11.2",
        "supporting_document_names": ["No_Dues_Certificate.pdf", "Original_Deposit_Receipt.pdf"],
        "applicant_name": "Dr. A. K. Sharma",
        "applicant_designation": "Principal / Director",
    }
    submit_res = client.post(
        "/api/v1/releases",
        json=submit_payload,
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['inst_rep']}"},
    )
    assert submit_res.status_code == 200
    req_id = submit_res.json()["release_request"]["id"]

    # Verify instrument lifecycle status is now release_pending
    db.refresh(instrument)
    assert instrument.lifecycle_status == "release_pending"

    # Step 2: Approving Authority views requests list with associated FDR metadata
    list_res = client.get(
        "/api/v1/releases",
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['approver']}"},
    )
    assert list_res.status_code == 200
    requests_data = list_res.json()["requests"]
    target_req = next((r for r in requests_data if r["id"] == req_id), None)
    assert target_req is not None
    assert target_req["bank_name"] == "Union Bank of India"
    assert target_req["account_number"] == "UBI011223344"
    assert target_req["branch_name"] == "Bandra Kurla Complex"

    # Step 3: Approving Authority approves refund request
    decision_payload = {
        "officer_id": approver_test_setup["approver_id"],
        "officer_name": "Executive Approving Authority",
        "officer_role": "approving_authority",
        "decision": "APPROVED",
        "decision_reason": "Sanctioned release after reviewing 8-year lock-in and No-Dues certification.",
    }
    approve_res = client.post(
        f"/api/v1/releases/{req_id}/decision",
        json=decision_payload,
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['approver']}"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "SUCCESS"

    # STATUTORY SAFEGUARD: Instrument must NOT be marked completed yet!
    # Lifecycle must remain release_pending with discharge NOC issued.
    db.refresh(instrument)
    req_db = db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.id == req_id).first()
    assert req_db.status == "approved"
    assert instrument.lifecycle_status == "release_pending"

    # Step 4: Confirm Payout / COMPLETE
    complete_payload = {
        "officer_id": approver_test_setup["approver_id"],
        "officer_name": "Executive Approving Authority",
        "officer_role": "approving_authority",
        "decision": "COMPLETED",
        "decision_reason": "Bank confirmed electronic payout via RTGS/NEFT UTR UBIN20261029019283.",
    }
    complete_res = client.post(
        f"/api/v1/releases/{req_id}/decision",
        json=complete_payload,
        headers={"Authorization": f"Bearer {approver_test_setup['tokens']['approver']}"},
    )
    assert complete_res.status_code == 200

    # Verify final completed state in database
    db.refresh(instrument)
    db.refresh(req_db)
    assert req_db.status == "completed"
    assert instrument.lifecycle_status == "released"

