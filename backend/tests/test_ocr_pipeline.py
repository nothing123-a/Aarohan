"""
Actual OCR Pipeline & Document Extraction Integration Tests
Verifies real OCR extraction, RapidOCR / PyMuPDF processing, target field parsing,
error handling, database persistence, and Scrutiny Officer API endpoints according to PRD.md.
"""
import io
import os
import sys
import uuid
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Set SQLite database for testing isolation
os.environ["DATABASE_URL"] = "sqlite:///./fdr_smart.db"

import pymupdf

from app.core.database import SessionLocal
from app.core.models import (
    FinancialInstrument,
    Institution,
    InstrumentDocument,
    DocumentExtractionRun as DocumentExtractionRunModel,
    User,
)
from app.modules.document_processing.ocr_service import (
    process_document_ocr,
    get_latest_extraction_run,
    extract_fields_from_text,
    ExtractedField,
    TARGET_FIELD_DEFS,
)
from app.modules.documents.storage import store_document, get_document_file_path


class TestActualOCRPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

        # Ensure a test institution exists
        cls.institution = cls.db.query(Institution).filter(Institution.id == "test-inst-ocr").first()
        if not cls.institution:
            cls.institution = Institution(
                id="test-inst-ocr",
                name="Indian Institute of Technology Delhi",
                institution_code="AICTE-NZ-IITD",
            )
            cls.db.add(cls.institution)

        # Ensure a test user exists
        cls.user = cls.db.query(User).filter(User.id == "test-officer-ocr").first()
        if not cls.user:
            cls.user = User(
                id="test-officer-ocr",
                email="scrutiny.officer@aicte.gov.in",
                display_name="Anil Verma",
                role="scrutiny_officer",
            )
            cls.db.add(cls.user)

        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_all_target_fields_present_in_definitions(self):
        """Verify that all target fields from PRD are defined in TARGET_FIELD_DEFS."""
        required_keys = [
            "bank_name",
            "branch_name",
            "branch_address",
            "ifsc_code",
            "reference_number",
            "fdr_number",
            "depositor_name",
            "account_number",
            "joint_depositor",
            "amount",
            "amount_in_words",
            "currency",
            "issue_date",
            "maturity_date",
            "tenure",
            "interest_rate",
            "maturity_amount",
            "payout_instructions",
            "lien_status",
            "lien_beneficiary",
            "lien_purpose",
        ]
        for key in required_keys:
            self.assertIn(key, TARGET_FIELD_DEFS, f"Target field '{key}' missing from TARGET_FIELD_DEFS")

    def test_02_electronic_pdf_text_extraction(self):
        """Tests PyMuPDF native selectable text extraction from electronic PDF."""
        doc = pymupdf.open()
        page = doc.new_page(width=600, height=800)
        lines = [
            "STATE BANK OF INDIA",
            "Parliament Street Branch, New Delhi - 110001",
            "IFSC Code: SBIN0000691",
            "FIXED DEPOSIT RECEIPT",
            "FDR Number: FDR/AICTE/2026/0991",
            "Customer Account: 30982348123",
            "Depositor Name: Indian Institute of Technology Delhi",
            "Principal Deposit Amount: Rs. 50,00,000.00",
            "Rupees Fifty Lakh Only",
            "Deposit Date: 15/03/2024",
            "Maturity Date: 15/03/2027",
            "Tenure: 36 Months",
            "Interest Rate: 7.25% p.a.",
            "Maturity Amount: Rs. 61,85,250.00",
            "Interest Payout: Cumulative / On Maturity",
            "Lien: Joint Lien marked in favour of Member Secretary, AICTE, New Delhi",
            "Lien Purpose: Statutory Deposit for AICTE Regulatory Approval",
        ]
        y = 50
        for line in lines:
            page.insert_text((50, y), line, fontsize=11)
            y += 28

        pdf_bytes = doc.tobytes()
        doc.close()

        stored_doc = store_document(
            content=pdf_bytes,
            original_filename="sample_electronic_fdr.pdf",
            mime_type="application/pdf",
            instrument_id="inst-test-electronic",
            uploaded_by_user_id="user-test-rep",
            db=self.db,
        )

        file_path = get_document_file_path(stored_doc.id, db=self.db)
        self.assertIsNotNone(file_path)

        run = process_document_ocr(
            document_id=stored_doc.id,
            file_path=file_path,
            original_filename="sample_electronic_fdr.pdf",
            db=self.db,
        )

        self.assertEqual(run.status, "completed")
        self.assertGreater(run.ocr_confidence, 80.0)

        fields = run.extracted_fields
        self.assertEqual(fields["bank_name"].value, "State Bank of India")
        self.assertEqual(fields["bank_name"].status, "found")
        self.assertEqual(fields["ifsc_code"].value, "SBIN0000691")
        self.assertEqual(fields["fdr_number"].value, "FDR/AICTE/2026/0991")
        self.assertEqual(fields["amount"].value, 5000000.0)
        self.assertEqual(fields["currency"].value, "INR")
        self.assertEqual(fields["issue_date"].value, "2024-03-15")
        self.assertEqual(fields["maturity_date"].value, "2027-03-15")
        self.assertEqual(fields["interest_rate"].value, 7.25)
        self.assertIn("Member Secretary", fields["lien_beneficiary"].value)

    def test_03_genuine_rapidocr_image_extraction(self):
        """Tests genuine RapidOCR character recognition on a synthetic image file."""
        doc = pymupdf.open()
        p = doc.new_page(width=850, height=450)
        p.insert_text((40, 50), "PUNJAB NATIONAL BANK", fontsize=20)
        p.insert_text((40, 95), "Receipt No: FDR/AICTE/2026/0442", fontsize=16)
        p.insert_text((40, 140), "Depositor: Indian Institute of Technology Delhi", fontsize=16)
        p.insert_text((40, 185), "Principal Amount: Rs. 35,00,000.00", fontsize=16)
        p.insert_text((40, 230), "Interest Rate: 7.10% p.a.", fontsize=16)
        p.insert_text((40, 275), "Issue Date: 10/01/2024  Maturity Date: 10/01/2027", fontsize=16)
        p.insert_text((40, 320), "IFSC Code: PUNB0001234", fontsize=16)
        p.insert_text((40, 365), "Joint Lien in favour of Member Secretary, AICTE New Delhi", fontsize=16)

        pix = p.get_pixmap(dpi=200)
        png_bytes = pix.tobytes("png")
        doc.close()

        stored_doc = store_document(
            content=png_bytes,
            original_filename="sample_scanned_receipt.png",
            mime_type="image/png",
            instrument_id="inst-test-image",
            uploaded_by_user_id="user-test-rep",
            db=self.db,
        )

        file_path = get_document_file_path(stored_doc.id, db=self.db)
        self.assertIsNotNone(file_path)

        run = process_document_ocr(
            document_id=stored_doc.id,
            file_path=file_path,
            original_filename="sample_scanned_receipt.png",
            db=self.db,
        )

        self.assertEqual(run.status, "completed")
        self.assertGreater(run.ocr_confidence, 50.0)
        self.assertIn("PUNJAB NATIONAL BANK", run.raw_text.upper())

        fields = run.extracted_fields
        self.assertEqual(fields["bank_name"].value, "Punjab National Bank")
        self.assertEqual(fields["amount"].value, 3500000.0)
        self.assertEqual(fields["interest_rate"].value, 7.1)
        self.assertEqual(fields["ifsc_code"].value, "PUNB0001234")
        self.assertIn("Member Secretary", fields["lien_beneficiary"].value)

    def test_04_scanned_pdf_rendering_and_ocr(self):
        """Tests scanned image embedded in PDF without text layer: renders pixmap and runs RapidOCR."""
        doc_img = pymupdf.open()
        p_img = doc_img.new_page(width=800, height=400)
        p_img.insert_text((40, 50), "CANARA BANK", fontsize=20)
        p_img.insert_text((40, 95), "Fixed Deposit Receipt: FDR/AICTE/2026/0775", fontsize=16)
        p_img.insert_text((40, 140), "Principal Amount: Rs. 25,00,000.00", fontsize=16)
        p_img.insert_text((40, 185), "Date of Issue: 20/04/2024  Maturity Date: 20/04/2027", fontsize=16)
        p_img.insert_text((40, 230), "IFSC Code: CNRB0001984", fontsize=16)
        p_img.insert_text((40, 275), "Joint Lien in favour of Member Secretary, AICTE New Delhi", fontsize=16)
        pix = p_img.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        doc_img.close()

        # Embed as flat bitmap image inside PDF without selectable text
        doc = pymupdf.open()
        page = doc.new_page(width=800, height=400)
        page.insert_image(page.rect, stream=img_bytes)
        pdf_bytes = doc.tobytes()
        doc.close()

        stored_doc = store_document(
            content=pdf_bytes,
            original_filename="sample_scanned_only.pdf",
            mime_type="application/pdf",
            instrument_id="inst-test-scanned-pdf",
            uploaded_by_user_id="user-test-rep",
            db=self.db,
        )

        file_path = get_document_file_path(stored_doc.id, db=self.db)
        run = process_document_ocr(
            document_id=stored_doc.id,
            file_path=file_path,
            original_filename="sample_scanned_only.pdf",
            db=self.db,
        )

        self.assertEqual(run.status, "completed")
        self.assertIn("CANARA", run.raw_text.upper())
        fields = run.extracted_fields
        self.assertEqual(fields["bank_name"].value, "Canara Bank")
        self.assertEqual(fields["amount"].value, 2500000.0)

    def test_05_unextracted_fields_return_not_found(self):
        """Verifies that target fields absent from document return 'Not Found' with status='not_found'."""
        sparse_text = "STATE BANK OF INDIA\nFDR/AICTE/2026/0111\nPrincipal: Rs. 10,00,000"
        fields = extract_fields_from_text(sparse_text)

        self.assertEqual(fields["bank_name"].value, "State Bank of India")
        self.assertEqual(fields["bank_name"].status, "found")

        # Absent fields
        self.assertEqual(fields["branch_address"].value, "Not Found")
        self.assertEqual(fields["branch_address"].status, "not_found")
        self.assertEqual(fields["account_number"].value, "Not Found")
        self.assertEqual(fields["account_number"].status, "not_found")
        self.assertEqual(fields["tenure"].value, "Not Found")
        self.assertEqual(fields["tenure"].status, "not_found")

    def test_06_database_persistence_of_extraction_run(self):
        """Verifies that DocumentExtractionRun persists properly in Supabase/PostgreSQL schema."""
        doc = pymupdf.open()
        p = doc.new_page(width=500, height=300)
        p.insert_text((50, 50), "BANK OF BARODA\nReceipt: FDR/AICTE/2026/0333\nAmount: Rs. 15,00,000.00")
        pdf_bytes = doc.tobytes()
        doc.close()

        stored_doc = store_document(
            content=pdf_bytes,
            original_filename="bob_fdr.pdf",
            mime_type="application/pdf",
            instrument_id="inst-test-db-persist",
            uploaded_by_user_id="user-test-rep",
            db=self.db,
        )

        file_path = get_document_file_path(stored_doc.id, db=self.db)
        run = process_document_ocr(
            document_id=stored_doc.id,
            file_path=file_path,
            original_filename="bob_fdr.pdf",
            db=self.db,
        )

        # Retrieve from database
        db_run = (
            self.db.query(DocumentExtractionRunModel)
            .filter(DocumentExtractionRunModel.id == run.id)
            .first()
        )
        self.assertIsNotNone(db_run)
        self.assertEqual(db_run.document_id, stored_doc.id)
        self.assertEqual(db_run.status, "completed")
        self.assertIsInstance(db_run.extracted_fields, dict)
        self.assertIn("amount", db_run.extracted_fields)

        # Verify get_latest_extraction_run helper
        retrieved_run = get_latest_extraction_run(stored_doc.id, db=self.db)
        self.assertIsNotNone(retrieved_run)
        self.assertEqual(retrieved_run.id, run.id)

    def test_07_verification_extract_endpoint(self):
        """Tests Scrutiny Officer on-demand extraction API endpoint POST /api/v1/verification/extract/{instrument_id}."""
        # Create an instrument
        inst_id = f"inst-{uuid.uuid4().hex[:6]}"
        inst = FinancialInstrument(
            id=inst_id,
            institution_id=self.institution.id,
            reference_number=f"FDR/AICTE/2026/{uuid.uuid4().hex[:4].upper()}",
            bank_name="State Bank of India",
            amount=5000000.0,
            issue_date=datetime.now(timezone.utc).date(),
            maturity_date=(datetime.now(timezone.utc) + timedelta(days=365 * 3)).date(),
            interest_rate=7.25,
            submitted_by_user_id=self.user.id,
            verification_status="under_scrutiny",
            financial_verification_status="pending",
            lifecycle_status="lodged",
        )
        self.db.add(inst)
        self.db.commit()

        # Attach a document
        doc = pymupdf.open()
        p = doc.new_page(width=500, height=400)
        p.insert_text(
            (40, 40),
            f"STATE BANK OF INDIA\n"
            f"Receipt No: {inst.reference_number}\n"
            f"Principal Amount: Rs. 50,00,000.00\n"
            f"Depositor: Indian Institute of Technology Delhi\n"
            f"Lien marked in favour of Member Secretary, AICTE, New Delhi\n"
        )
        pdf_bytes = doc.tobytes()
        doc.close()

        store_document(
            content=pdf_bytes,
            original_filename="attached_certificate.pdf",
            mime_type="application/pdf",
            instrument_id=inst.id,
            uploaded_by_user_id=self.user.id,
            db=self.db,
        )

        # Call extraction endpoint handler directly
        from app.api.v1.verification import trigger_instrument_extraction, get_verification_dossier, record_field_correction, FieldCorrectionRequest

        data = trigger_instrument_extraction(inst.id, db=self.db)
        self.assertTrue(data["success"])
        self.assertIn("extraction_run", data)
        self.assertEqual(data["extraction_run"]["extracted_fields"]["bank_name"]["value"], "State Bank of India")

        # Call dossier endpoint handler directly
        dossier_data = get_verification_dossier(inst.id, db=self.db)
        self.assertIsNotNone(dossier_data["latest_extraction_run"])
        self.assertEqual(len(dossier_data["documents"]), 1)

    def test_08_field_correction_endpoint(self):
        """Tests field correction API endpoint POST /api/v1/verification/correct-field."""
        from app.api.v1.verification import record_field_correction, FieldCorrectionRequest

        inst_id = f"inst-{uuid.uuid4().hex[:6]}"
        inst = FinancialInstrument(
            id=inst_id,
            institution_id=self.institution.id,
            reference_number="FDR/AICTE/2026/9999",
            bank_name="Union Bank of India",
            amount=2000000.0,
            submitted_by_user_id=self.user.id,
            verification_status="under_scrutiny",
            financial_verification_status="pending",
            lifecycle_status="lodged",
        )
        self.db.add(inst)
        self.db.commit()

        req = FieldCorrectionRequest(
            instrument_id=inst.id,
            field_name="branch_name",
            corrected_value="Connaught Place Branch, New Delhi",
            correction_reason="Verified against physical bank rubber stamp on certificate scan Page 1",
            officer_user_id=self.user.id,
        )
        data = record_field_correction(req, db=self.db)
        self.assertTrue(data["success"])
        self.assertEqual(data["field_name"], "branch_name")
        self.assertEqual(data["corrected_value"], "Connaught Place Branch, New Delhi")


if __name__ == "__main__":
    unittest.main()
