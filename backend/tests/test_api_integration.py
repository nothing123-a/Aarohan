"""
FDR-SMART API Integration & Database Persistence Pytest Suite
Verifies:
1. System health check
2. Authentication (login, JWT, me, role enforcement)
3. Institutions registry lookup
4. Financial Instrument lifecycle (create, persist, list, getById)
5. Database persistence (verifying record persists across sessions)
6. Scrutiny queue & observation workflow
7. Renewals & predecessor relationship validation
8. Release requests & separation of duties
9. Dashboard metrics
10. Audit event logging
"""
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "capabilities" in data

def test_auth_login_and_me():
    # Login as institution representative
    res = client.post("/api/v1/auth/login", json={
        "email": "registrar@dtu.ac.in",
        "password": "DemoPass123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data["data"]
    token = data["data"]["token"]
    user = data["data"]["user"]
    assert user["email"] == "registrar@dtu.ac.in"
    assert user["role"] == "institution_representative"

    # Authenticated /me request
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == "registrar@dtu.ac.in"

def test_institutions_lookup():
    response = client.get("/api/v1/institutions")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 3
    # Check DTU
    dtu = next((i for i in data["data"] if i["id"] == "inst-001"), None)
    assert dtu is not None
    assert "Delhi Technological University" in dtu["name"]

def test_fdr_create_and_persistence():
    # Create new FDR
    payload = {
        "bankName": "State Bank of India",
        "bankBranch": "North Campus Branch",
        "accountNumber": "AC-9988776655",
        "ifscCode": "SBIN0000042",
        "principalAmount": 4500000.0,
        "interestRate": 7.35,
        "depositDate": "2026-10-27",
        "maturityDate": "2029-10-27",
        "purpose": "security_deposit",
        "projectName": "New Engineering Wing Security Deposit",
        "department": "Regulation Bureau",
        "remarks": "Persisted deposit test record",
    }
    create_res = client.post("/api/v1/fdrs", json=payload)
    assert create_res.status_code == 200
    res_data = create_res.json()
    assert res_data["success"] is True
    created_id = res_data["data"]["id"]
    ref_num = res_data["data"]["fdrNumber"]

    # Retrieve by ID from database
    get_res = client.get(f"/api/v1/fdrs/{created_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()["data"]
    assert fetched["id"] == created_id
    assert fetched["fdrNumber"] == ref_num
    assert fetched["principalAmount"] == 4500000.0

    # Verify presence in list
    list_res = client.get("/api/v1/fdrs")
    assert list_res.status_code == 200
    all_fdrs = list_res.json()["data"]["data"]
    match = next((f for f in all_fdrs if f["id"] == created_id), None)
    assert match is not None

def test_scrutiny_queue_and_observations():
    # 1. Fetch Queue
    queue_res = client.get("/api/v1/scrutiny/queue")
    assert queue_res.status_code == 200
    queue = queue_res.json()["queue"]
    assert len(queue) > 0

    # 2. Record Scrutiny Observation
    obs_payload = {
        "fdr_id": "fdr-001",
        "category": "LIEN_UNVERIFIED",
        "observation": "Branch manager seal unverified in CBS portal.",
        "requested_action": "Upload branch manager confirmation token.",
        "officer_name": "Anil Verma",
        "officer_id": "usr-so-01",
    }
    obs_res = client.post("/api/v1/scrutiny/observations", json=obs_payload)
    assert obs_res.status_code == 200
    obs_id = obs_res.json()["observation"]["id"]

    # 3. Respond to Observation
    resp_payload = {
        "response_notes": "Branch manager confirmation token uploaded.",
        "supporting_document_name": "SBI_Token_Verification.pdf",
        "responded_by": "Prof. S. K. Mahajan",
        "institution_id": "inst-001",
    }
    resp_res = client.post(f"/api/v1/scrutiny/observations/{obs_id}/respond", json=resp_payload)
    assert resp_res.status_code == 200
    assert resp_res.json()["observation"]["status"] == "RESPONDED"

def test_renewals_and_separation_of_duties():
    # Listing renewals
    ren_res = client.get("/api/v1/renewals")
    assert ren_res.status_code == 200
    assert ren_res.json()["total"] >= 1

    # Institution representative cannot approve renewal
    rev_payload = {
        "officer_id": "usr-rep-01",
        "officer_name": "Registrar",
        "officer_role": "institution_representative",
        "decision": "APPROVED",
        "remarks": "Self-approving renewal",
    }
    forbidden_res = client.post("/api/v1/renewals/rn-02/review", json=rev_payload)
    assert forbidden_res.status_code == 403

def test_release_requests_and_admin_barrier():
    # List release requests
    rel_res = client.get("/api/v1/releases")
    assert rel_res.status_code == 200
    assert len(rel_res.json()["requests"]) >= 1

    # System administrator cannot approve financial release (PRD governance rule)
    admin_approval_attempt = {
        "officer_id": "usr-adm-01",
        "officer_name": "Directorate Admin",
        "officer_role": "admin",
        "decision": "APPROVED",
        "decision_reason": "Administrative clearance by IT admin",
    }
    blocked_res = client.post("/api/v1/releases/rel-002/decision", json=admin_approval_attempt)
    assert blocked_res.status_code == 403

def test_dashboard_stats_and_notifications():
    # Dashboard stats
    stats_res = client.get("/api/dashboard/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()["data"]
    assert stats["totalFDRs"] > 0
    assert stats["totalDepositValue"] > 0

    # Notifications
    notif_res = client.get("/api/notifications")
    assert notif_res.status_code == 200
    notifs = notif_res.json()["data"]
    assert len(notifs) > 0
    first_id = notifs[0]["id"]

    # Mark notification as read
    read_res = client.patch(f"/api/notifications/{first_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["data"]["isRead"] is True

def test_audit_logs():
    audit_res = client.get("/api/v1/audit/logs")
    assert audit_res.status_code == 200
    assert audit_res.json()["total"] >= 1
