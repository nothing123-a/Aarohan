"""
Bank Verification Module Tests
==============================
Tests the bank verification adapter interface, mock adapter behaviour,
service layer (RBAC, caching, persistence), and API endpoint.

Covers:
  - Mock adapter: verified, discrepancy_found, service_unavailable, invalid_reference scenarios.
  - AbstractBankAdapter._compare_fields field comparison logic.
  - Service layer RBAC (scrutiny_officer allowed, institution_representative blocked).
  - Service layer: result persisted as InstrumentVerification + VerificationDiscrepancy rows.
  - Service layer: cache returns existing result within freshness window.
  - API endpoint: 401 when unauthenticated.
  - API endpoint: 403 when called by institution_representative.
  - API endpoint: 404 when instrument not found.
  - API endpoint: successful response structure for mock verified result.
  - API endpoint: history endpoint returns correct records.
"""
import asyncio
import pytest
import uuid
from decimal import Decimal
from datetime import date, datetime, timezone, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.models import (
    FinancialInstrument,
    Institution,
    User,
    InstrumentVerification,
    VerificationDiscrepancy,
)
from app.core.security import create_access_token
from app.modules.bank_verification.base import InstrumentSnapshot, BankVerificationResult
from app.modules.bank_verification.adapters.mock_adapter import MockBankAdapter

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def bv_institution(db):
    inst = db.query(Institution).filter(Institution.id == "inst-bv-test").first()
    if not inst:
        inst = Institution(
            id="inst-bv-test",
            institution_code="AICTE-BV-TEST",
            name="Bank Verification Test Institute",
            status="active",
        )
        db.add(inst)
        db.commit()
    return inst


@pytest.fixture(scope="module")
def scrutiny_user(db):
    user = db.query(User).filter(User.email == "bv_scrutiny@aicte.gov.in").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="bv_scrutiny@aicte.gov.in",
            display_name="BV Scrutiny Officer",
            role="scrutiny_officer",
            status="active",
        )
        db.add(user)
        db.commit()
    return user


@pytest.fixture(scope="module")
def inst_rep_user(db):
    user = db.query(User).filter(User.email == "bv_rep@institute.edu.in").first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email="bv_rep@institute.edu.in",
            display_name="BV Institution Rep",
            role="institution_representative",
            status="active",
        )
        db.add(user)
        db.commit()
    return user


@pytest.fixture(scope="module")
def test_instrument(db, bv_institution, scrutiny_user):
    """A standard instrument with reference ending in OK (mock → verified)."""
    inst = db.query(FinancialInstrument).filter(
        FinancialInstrument.id == "fi-bv-test-ok"
    ).first()
    if not inst:
        inst = FinancialInstrument(
            id="fi-bv-test-ok",
            institution_id=bv_institution.id,
            reference_number="FDR-2025-BV-OK",
            bank_name="State Bank of India",
            amount=Decimal("5000000.00"),
            currency="INR",
            issue_date=date(2025, 1, 15),
            maturity_date=date(2028, 1, 15),
            submission_status="submitted",
            verification_status="pending",
            financial_verification_status="pending",
            submitted_by_user_id=scrutiny_user.id,
        )
        db.add(inst)
        db.commit()
    return inst


@pytest.fixture(scope="module")
def mis_instrument(db, bv_institution, scrutiny_user):
    """Instrument with reference ending in MIS (mock → discrepancy_found)."""
    inst = db.query(FinancialInstrument).filter(
        FinancialInstrument.id == "fi-bv-test-mis"
    ).first()
    if not inst:
        inst = FinancialInstrument(
            id="fi-bv-test-mis",
            institution_id=bv_institution.id,
            reference_number="FDR-2025-BV-MIS",
            bank_name="State Bank of India",
            amount=Decimal("3000000.00"),
            currency="INR",
            issue_date=date(2025, 3, 1),
            maturity_date=date(2028, 3, 1),
            submission_status="submitted",
            verification_status="pending",
            financial_verification_status="pending",
            submitted_by_user_id=scrutiny_user.id,
        )
        db.add(inst)
        db.commit()
    return inst


@pytest.fixture(scope="module")
def unav_instrument(db, bv_institution, scrutiny_user):
    """Instrument with reference ending in UNAV (mock → service_unavailable)."""
    inst = db.query(FinancialInstrument).filter(
        FinancialInstrument.id == "fi-bv-test-unav"
    ).first()
    if not inst:
        inst = FinancialInstrument(
            id="fi-bv-test-unav",
            institution_id=bv_institution.id,
            reference_number="FDR-2025-BV-UNAV",
            bank_name="State Bank of India",
            amount=Decimal("2000000.00"),
            currency="INR",
            issue_date=date(2025, 6, 1),
            maturity_date=date(2028, 6, 1),
            submission_status="submitted",
            verification_status="pending",
            financial_verification_status="pending",
            submitted_by_user_id=scrutiny_user.id,
        )
        db.add(inst)
        db.commit()
    return inst


def _token(user: User) -> str:
    return create_access_token({"sub": user.id, "role": user.role})


# ---------------------------------------------------------------------------
# Unit tests: MockBankAdapter — tested via API endpoint (FastAPI TestClient
# manages its own event loop via anyio, so asyncio.sleep works there).
# Direct adapter tests use a synchronous helper that calls the adapter
# inside FastAPI's test event loop using the TestClient's AnyIO backend.
# ---------------------------------------------------------------------------

def _run_adapter(adapter, snapshot):
    """
    Helper: call adapter.verify() via a thin FastAPI route so that
    TestClient (anyio) manages the event loop — avoids asyncio.run()
    which hangs in this sandbox environment.
    """
    from fastapi import FastAPI
    from fastapi.testclient import TestClient as _TC

    _tmp_app = FastAPI()

    @_tmp_app.post("/run")
    async def _route():
        return (await adapter.verify(snapshot)).model_dump()

    with _TC(_tmp_app) as _tc:
        resp = _tc.post("/run")
        assert resp.status_code == 200
        from app.modules.bank_verification.base import BankVerificationResult, BankFDRDetails, FieldMismatch
        data = resp.json()
        # Reconstruct minimal result for assertions
        return data


def test_mock_adapter_verified():
    """Reference ending in OK returns verified result."""
    from app.modules.bank_verification.base import InstrumentSnapshot
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="test-ok",
        reference_number="FDR-2025-OK",
        bank_name="State Bank of India",
        amount=Decimal("5000000.00"),
        currency="INR",
        issue_date=date(2025, 1, 15),
        maturity_date=date(2028, 1, 15),
    )
    data = _run_adapter(adapter, snapshot)
    assert data["status"] == "verified"
    assert data["data_source"] == "demonstration"
    assert data["adapter_name"] == "mock_demo"
    assert data["bank_details"] is not None
    assert data["bank_details"]["lien_confirmed"] is True
    assert len(data["mismatches"]) == 0


def test_mock_adapter_discrepancy():
    """Reference ending in MIS returns discrepancy_found with amount mismatch."""
    from app.modules.bank_verification.base import InstrumentSnapshot
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="test-mis",
        reference_number="FDR-2025-MIS",
        bank_name="State Bank of India",
        amount=Decimal("3000000.00"),
        currency="INR",
    )
    data = _run_adapter(adapter, snapshot)
    assert data["status"] == "discrepancy_found"
    assert data["data_source"] == "demonstration"
    assert any(m["field_name"] == "principal_amount" for m in data["mismatches"])
    mismatch = next(m for m in data["mismatches"] if m["field_name"] == "principal_amount")
    assert mismatch["severity"] == "CRITICAL"


def test_mock_adapter_service_unavailable():
    """Reference ending in UNAV returns service_unavailable."""
    from app.modules.bank_verification.base import InstrumentSnapshot
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="test-unav",
        reference_number="FDR-2025-UNAV",
        bank_name="State Bank of India",
        amount=Decimal("2000000.00"),
        currency="INR",
    )
    data = _run_adapter(adapter, snapshot)
    assert data["status"] == "service_unavailable"
    assert data["data_source"] == "demonstration"
    assert data["error_code"] == "TIMEOUT"
    assert data["bank_details"] is None


def test_mock_adapter_invalid_reference():
    """Reference ending in INVREF returns invalid_reference."""
    from app.modules.bank_verification.base import InstrumentSnapshot
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="test-inv",
        reference_number="FDR-2025-INVREF",
        bank_name="State Bank of India",
        amount=Decimal("1000000.00"),
        currency="INR",
    )
    data = _run_adapter(adapter, snapshot)
    assert data["status"] == "invalid_reference"
    assert data["error_code"] == "REF_NOT_FOUND"


# ---------------------------------------------------------------------------
# Unit tests: field comparison
# ---------------------------------------------------------------------------

def test_compare_fields_no_mismatches():
    """All matching fields → empty mismatch list."""
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="x",
        reference_number="REF-001",
        bank_name="State Bank of India",
        amount=Decimal("1000000.00"),
        currency="INR",
        issue_date=date(2025, 1, 1),
        maturity_date=date(2028, 1, 1),
    )
    from app.modules.bank_verification.base import BankFDRDetails
    bank = BankFDRDetails(
        reference_number="REF-001",
        bank_name="State Bank of India",
        principal_amount=Decimal("1000000.00"),
        issue_date=date(2025, 1, 1),
        maturity_date=date(2028, 1, 1),
    )
    mismatches = adapter._compare_fields(snapshot, bank)
    assert mismatches == []


def test_compare_fields_amount_mismatch():
    """Amount difference > ₹1 → CRITICAL mismatch."""
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="x",
        reference_number="REF-002",
        bank_name="SBI",
        amount=Decimal("1000000.00"),
        currency="INR",
    )
    from app.modules.bank_verification.base import BankFDRDetails
    bank = BankFDRDetails(principal_amount=Decimal("1050000.00"))
    mismatches = adapter._compare_fields(snapshot, bank)
    assert any(m.field_name == "principal_amount" and m.severity == "CRITICAL" for m in mismatches)


def test_compare_fields_amount_within_tolerance():
    """Amount difference ≤ ₹1 → no mismatch (rounding tolerance)."""
    adapter = MockBankAdapter()
    snapshot = InstrumentSnapshot(
        instrument_id="x",
        reference_number="REF-003",
        bank_name="SBI",
        amount=Decimal("1000000.00"),
        currency="INR",
    )
    from app.modules.bank_verification.base import BankFDRDetails
    bank = BankFDRDetails(principal_amount=Decimal("1000000.50"))
    mismatches = adapter._compare_fields(snapshot, bank)
    assert not any(m.field_name == "principal_amount" for m in mismatches)


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

def test_bank_verify_unauthenticated(test_instrument):
    """No token → 401."""
    resp = client.post(f"/api/v1/verification/bank-verify/{test_instrument.id}")
    assert resp.status_code == 401


def test_bank_verify_institution_rep_forbidden(test_instrument, inst_rep_user):
    """Institution representative → 403."""
    token = _token(inst_rep_user)
    resp = client.post(
        f"/api/v1/verification/bank-verify/{test_instrument.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert "Permission Denied" in resp.json()["detail"]


def test_bank_verify_instrument_not_found(scrutiny_user):
    """Non-existent instrument ID → 404."""
    token = _token(scrutiny_user)
    resp = client.post(
        "/api/v1/verification/bank-verify/non-existent-id-12345",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


def test_bank_verify_ok_scenario(test_instrument, scrutiny_user, db):
    """Scrutiny Officer verifying a …OK instrument → verified demo result."""
    token = _token(scrutiny_user)
    resp = client.post(
        f"/api/v1/verification/bank-verify/{test_instrument.id}?force_refresh=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "verified"
    assert data["data_source"] == "demonstration"
    assert data["is_demo"] is True
    assert data["is_live_bank"] is False
    assert "demo_notice" in data and data["demo_notice"] is not None
    assert data["mismatch_count"] == 0
    assert data["bank_details"] is not None
    assert data["bank_details"]["lien_confirmed"] is True

    # Verify InstrumentVerification was persisted
    verif_id = data["verification_id"]
    verif = db.query(InstrumentVerification).filter(InstrumentVerification.id == verif_id).first()
    assert verif is not None
    assert verif.outcome == "verified"
    assert verif.verification_method == "bank_api"


def test_bank_verify_mismatch_scenario(mis_instrument, scrutiny_user, db):
    """Scrutiny Officer verifying a …MIS instrument → discrepancy_found."""
    token = _token(scrutiny_user)
    resp = client.post(
        f"/api/v1/verification/bank-verify/{mis_instrument.id}?force_refresh=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "discrepancy_found"
    assert data["mismatch_count"] > 0
    mismatch_fields = [m["field_name"] for m in data["mismatches"]]
    assert "principal_amount" in mismatch_fields

    # Verify VerificationDiscrepancy rows were persisted
    verif_id = data["verification_id"]
    discs = db.query(VerificationDiscrepancy).filter(
        VerificationDiscrepancy.verification_id == verif_id
    ).all()
    assert len(discs) > 0
    assert any(d.field_name == "principal_amount" for d in discs)


def test_bank_verify_unavailable_scenario(unav_instrument, scrutiny_user):
    """…UNAV instrument → service_unavailable; must NOT be discrepancy_found."""
    token = _token(scrutiny_user)
    resp = client.post(
        f"/api/v1/verification/bank-verify/{unav_instrument.id}?force_refresh=true",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # A failed API call must NOT be treated as a failed FDR verification
    assert data["status"] == "service_unavailable"
    assert data["status"] != "discrepancy_found"
    assert data["error_code"] == "TIMEOUT"
    assert data["bank_details"] is None


def test_bank_verify_cache(test_instrument, scrutiny_user):
    """Second call without force_refresh returns cached=true."""
    token = _token(scrutiny_user)
    # First call (may or may not already be cached)
    client.post(
        f"/api/v1/verification/bank-verify/{test_instrument.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    # Second call — must hit cache
    resp = client.post(
        f"/api/v1/verification/bank-verify/{test_instrument.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cached"] is True


def test_bank_verify_history(test_instrument, scrutiny_user):
    """History endpoint returns bank_api verification records."""
    token = _token(scrutiny_user)
    resp = client.get(
        f"/api/v1/verification/bank-verify/history/{test_instrument.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "history" in data
    assert data["total"] >= 1
    for record in data["history"]:
        assert "verification_id" in record
        assert "outcome" in record
        assert "reviewed_at" in record


def test_bank_verify_history_rep_forbidden(test_instrument, inst_rep_user):
    """Institution representative cannot access bank verification history."""
    token = _token(inst_rep_user)
    resp = client.get(
        f"/api/v1/verification/bank-verify/history/{test_instrument.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
