"""
Tests for Persistent Release and Refund Requests Workflow
Verifies database persistence, RBAC enforcement, and lifecycle state changes
using direct async invocation with database session.
"""
import sys
import os
import unittest
import asyncio
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Configure SQLite directly to avoid PostgreSQL socket connection timeout
os.environ["DATABASE_URL"] = "sqlite:///./fdr_smart.db"

from fastapi import HTTPException
from app.core.database import SessionLocal
from app.core.models import (
    FinancialInstrument,
    ReleaseRefundRequest,
    ReleaseRefundDecision,
    InstrumentLifecycleEvent,
    AuditEvent,
)
from app.modules.requests.router import (
    list_release_requests,
    submit_release_request,
    record_release_decision,
    ReleaseRequestCreate,
    ReleaseDecisionRecord,
)

class TestReleaseRequestsPersistence(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_list_release_requests_persisted(self):
        """Verify that existing release requests are retrieved directly from the database."""
        res = asyncio.run(list_release_requests(db=self.db))
        self.assertIn("total", res)
        self.assertIn("requests", res)
        self.assertGreaterEqual(res["total"], 1)
        ids = [r["id"] for r in res["requests"]]
        self.assertIn("rel-001", ids)

    def test_02_submit_release_request_persistence(self):
        """Verify submitting a release request persists in DB and updates instrument lifecycle."""
        inst = self.db.query(FinancialInstrument).filter(FinancialInstrument.id == "fdr-007").first()
        self.assertIsNotNone(inst)

        payload = ReleaseRequestCreate(
            fdr_id="fdr-007",
            fdr_number="FDR/AICTE/2026/115",
            institution_id="inst-003",
            institution_name="PSG College of Technology, Coimbatore",
            bank_name="Canara Bank",
            principal_amount=7500000.0,
            request_type="FULL_RELEASE",
            justification_reason="Statutory 5-year lock-in period concluded without liabilities.",
            regulatory_clause_reference="AICTE Approval Process Handbook Clause 11.2",
            supporting_document_names=["Canara_Bank_Original_FDR.pdf", "No_Dues_Certificate.pdf"],
            applicant_name="Dr. K. Prakasan",
            applicant_designation="Principal",
        )

        resp = asyncio.run(submit_release_request(payload, db=self.db))
        self.assertEqual(resp["status"], "SUCCESS")
        new_req_id = resp["release_request"]["id"]

        # Verify directly in database
        db_req = self.db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.id == new_req_id).first()
        self.assertIsNotNone(db_req)
        self.assertEqual(db_req.instrument_id, "fdr-007")
        self.assertEqual(db_req.request_type, "full_release")
        self.assertEqual(db_req.status, "submitted")

        # Verify instrument lifecycle status updated to release_pending
        self.db.refresh(inst)
        self.assertEqual(inst.lifecycle_status, "release_pending")

        # Verify audit event was created
        audit = self.db.query(AuditEvent).filter(
            AuditEvent.entity_type == "release_refund_requests",
            AuditEvent.entity_id == new_req_id,
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, "RELEASE_REQUEST_SUBMITTED")

    def test_03_rbac_boundaries_on_release_decisions(self):
        """Verify strict separation of duties and RBAC guards on release decisions."""
        # Find or create a request to decide on
        req = self.db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.instrument_id == "fdr-007").first()
        self.assertIsNotNone(req)
        req_id = req.id

        # Rule 1: Institution representative CANNOT participate in release decisions (403)
        rep_payload = ReleaseDecisionRecord(
            officer_id="usr-rep-01",
            officer_name="Prof. S. K. Mahajan",
            officer_role="institution_representative",
            decision="APPROVED",
            decision_reason="We have completed all requirements, please approve.",
        )
        with self.assertRaises(HTTPException) as ctx1:
            asyncio.run(record_release_decision(req_id, rep_payload, db=self.db))
        self.assertEqual(ctx1.exception.status_code, 403)
        self.assertIn("Permission Boundary Violation", ctx1.exception.detail)

        # Rule 2: System Administrator CANNOT approve financial releases (403)
        admin_payload = ReleaseDecisionRecord(
            officer_id="usr-adm-01",
            officer_name="System Admin",
            officer_role="admin",
            decision="APPROVED",
            decision_reason="System admin override approval attempt.",
        )
        with self.assertRaises(HTTPException) as ctx2:
            asyncio.run(record_release_decision(req_id, admin_payload, db=self.db))
        self.assertEqual(ctx2.exception.status_code, 403)
        self.assertIn("System Administrator role alone does not confer financial approval authority", ctx2.exception.detail)

        # Rule 3: Scrutiny Officer CANNOT give final financial approval (403)
        so_approve_payload = ReleaseDecisionRecord(
            officer_id="usr-so-01",
            officer_name="Anil Verma",
            officer_role="scrutiny_officer",
            decision="APPROVED",
            decision_reason="Technical scrutiny passed, attempting final sign-off.",
        )
        with self.assertRaises(HTTPException) as ctx3:
            asyncio.run(record_release_decision(req_id, so_approve_payload, db=self.db))
        self.assertEqual(ctx3.exception.status_code, 403)
        self.assertIn("Role Hierarchy Violation", ctx3.exception.detail)

        # Rule 4: Scrutiny Officer CAN recommend for approval (200)
        so_rec_payload = ReleaseDecisionRecord(
            officer_id="usr-so-01",
            officer_name="Anil Verma",
            officer_role="scrutiny_officer",
            decision="RECOMMENDED_FOR_APPROVAL",
            decision_reason="All documents verified in CBS, recommended for Member Secretary approval.",
        )
        rec_res = asyncio.run(record_release_decision(req_id, so_rec_payload, db=self.db))
        self.assertEqual(rec_res["status"], "SUCCESS")

        # Rule 5: Approving Authority CAN grant final financial approval (200)
        aa_payload = ReleaseDecisionRecord(
            officer_id="usr-aa-01",
            officer_name="Dr. Rajesh Sharma",
            officer_role="approving_authority",
            decision="APPROVED",
            decision_reason="Final administrative sign-off granted for Bank Discharge NOC issuance.",
        )
        app_res = asyncio.run(record_release_decision(req_id, aa_payload, db=self.db))
        self.assertEqual(app_res["status"], "SUCCESS")

        # Verify database state after administrative approval (authorizing Bank Discharge NOC)
        self.db.refresh(req)
        self.assertEqual(req.status, "approved")

        # Verify decision records are preserved
        decisions = self.db.query(ReleaseRefundDecision).filter(ReleaseRefundDecision.request_id == req_id).all()
        self.assertGreaterEqual(len(decisions), 2)

        # Statutory safeguard: instrument is NOT yet marked completed/released, remains release_pending
        inst = self.db.query(FinancialInstrument).filter(FinancialInstrument.id == "fdr-007").first()
        self.assertEqual(inst.lifecycle_status, "release_pending")

        # Step 6: Confirmation of bank payout / completion marks instrument as released
        complete_payload = ReleaseDecisionRecord(
            officer_id="usr-aa-01",
            officer_name="Dr. Rajesh Sharma",
            officer_role="approving_authority",
            decision="COMPLETED",
            decision_reason="Bank confirmed electronic payout via RTGS/NEFT transaction.",
        )
        comp_res = asyncio.run(record_release_decision(req_id, complete_payload, db=self.db))
        self.assertEqual(comp_res["status"], "SUCCESS")

        self.db.refresh(req)
        self.assertEqual(req.status, "completed")
        self.db.refresh(inst)
        self.assertEqual(inst.lifecycle_status, "released")

if __name__ == "__main__":
    unittest.main()
