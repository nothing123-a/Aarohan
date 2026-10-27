import httpx

BASE_URL = "http://localhost:8000/api/v1"

def test_full_lifecycle():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Scrutiny Queue
    print("1. Fetching Scrutiny Queue...")
    r = client.get("/scrutiny/queue")
    assert r.status_code == 200, f"Error: {r.text}"
    print(f"   Queue count: {r.json()['total_cases']}")

    # 2. Record Observation
    print("2. Recording Observation...")
    obs_payload = {
        "fdr_id": "fdr-002",
        "category": "AMOUNT_DISCREPANCY",
        "observation": "Discrepancy detected: Institutional form states Rs 30L while bank certificate indicates Rs 35L.",
        "requested_action": "Upload revised institutional declaration conforming to Rs 35,00,000.",
        "officer_name": "Anil Verma",
        "officer_id": "usr-so-01",
    }
    r = client.post("/scrutiny/observations", json=obs_payload)
    assert r.status_code == 200, f"Error: {r.text}"
    obs_id = r.json()["observation"]["id"]
    print(f"   Created observation ID: {obs_id}")

    # 3. Respond to Observation
    print("3. Responding to Observation...")
    resp_payload = {
        "response_notes": "Revised declaration uploaded conforming to Rs 35 Lakh bank deposit certificate.",
        "supporting_document_name": "DTU_Revised_Declaration_Rs35L.pdf",
        "responded_by": "Prof. S. K. Mahajan",
        "institution_id": "inst-001",
    }
    r = client.post(f"/scrutiny/observations/{obs_id}/respond", json=resp_payload)
    assert r.status_code == 200, f"Error: {r.text}"
    print(f"   Observation status after response: {r.json()['observation']['status']}")

    # 4. Renewal Submission & Predecessor Linking
    print("4. Submitting Renewal & Predecessor Linkage...")
    ren_payload = {
        "predecessor_fdr_id": "fdr-002",
        "predecessor_fdr_number": "FDR/AICTE/2026/092",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "replacement_fdr_number": "FDR/AICTE/2026/99312",
        "bank_name": "Punjab National Bank",
        "bank_branch": "Civil Lines, Delhi",
        "ifsc_code": "PUNB0123400",
        "principal_amount": 3500000.0,
        "interest_rate": 7.3,
        "new_issue_date": "2026-12-05",
        "new_maturity_date": "2029-12-05",
        "tenure_months": 36,
        "supporting_document_name": "PNB_Extension_Lien_Pledge_Token.pdf",
        "applicant_name": "Prof. S. K. Mahajan",
        "applicant_email": "registrar@dtu.ac.in",
        "justification": "Renewal of security deposit for 3-year term.",
    }
    r = client.post("/renewals", json=ren_payload)
    assert r.status_code == 200, f"Error: {r.text}"
    ren_id = r.json()["renewal_request"]["id"]
    linked_pred = r.json()["renewal_request"]["relationship"]["predecessor_instrument_id"]
    print(f"   Renewal Request ID: {ren_id}, Linked Predecessor: {linked_pred}")

    # 5. Submit Release Request
    print("5. Submitting Release Request...")
    rel_payload = {
        "fdr_id": "fdr-001",
        "fdr_number": "FDR/AICTE/2026/089",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "bank_name": "State Bank of India",
        "principal_amount": 5000000.0,
        "request_type": "FULL_RELEASE",
        "justification_reason": "Completed 5-year lock-in period. SRO No Dues clearance obtained.",
        "regulatory_clause_reference": "AICTE APH 2026 Clause 11.2",
        "supporting_document_names": ["SRO_No_Dues_Clearance_Certificate.pdf", "SBI_Original_FDR_Receipt.pdf"],
        "applicant_name": "Prof. S. K. Mahajan",
        "applicant_designation": "Registrar, DTU",
    }
    r = client.post("/releases", json=rel_payload)
    assert r.status_code == 200, f"Error: {r.text}"
    rel_id = r.json()["release_request"]["id"]
    print(f"   Release Request ID: {rel_id}")

    # 6. Test Permission Boundary (Admin should be REJECTED from financial approval)
    print("6. Testing Permission Boundary (Admin cannot approve financial release)...")
    dec_admin_payload = {
        "officer_id": "usr-adm-01",
        "officer_name": "Suresh Sharma",
        "officer_role": "admin",
        "decision": "APPROVED",
        "decision_reason": "Admin attempting sign-off.",
    }
    r = client.post(f"/releases/{rel_id}/decision", json=dec_admin_payload)
    assert r.status_code == 403, f"Expected 403 Forbidden for admin approval, got: {r.status_code}"
    print(f"   Boundary Verified: Admin approval blocked with 403: {r.json()['detail']}")

    # 7. Approving Authority Granting Official Approval
    print("7. Approving Authority Granting Official Approval...")
    dec_auth_payload = {
        "officer_id": "usr-auth-01",
        "officer_name": "Dr. Rajesh Sharma",
        "officer_role": "approving_authority",
        "decision": "APPROVED",
        "decision_reason": "Administrative approval granted under APH Clause 11.2 for Bank Discharge NOC.",
    }
    r = client.post(f"/releases/{rel_id}/decision", json=dec_auth_payload)
    assert r.status_code == 200, f"Error: {r.text}"
    print(f"   Decision Recorded: {r.json()['message']}")
    print(f"   Statutory Safeguard Notice: {r.json()['statutory_safeguard_notice']}")

    # 8. Check Audit Logs
    print("8. Inspecting Audit Logs...")
    r = client.get("/audit/logs")
    assert r.status_code == 200, f"Error: {r.text}"
    print(f"   Total Audit Logs: {r.json()['total']}")
    print("\n>>> ALL ACCEPTANCE CRITERIA ENDPOINTS PASSED WITH 100% CONCORDANCE! <<<")

if __name__ == "__main__":
    test_full_lifecycle()
