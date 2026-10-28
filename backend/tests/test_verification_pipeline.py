"""
Verification Pipeline Test Suite
Tests all 8 regulatory scrutiny scenarios required by the prompt:
1. Matching fields (100% concordance)
2. Amount mismatch (Critical discrepancy)
3. IFSC mismatch (Warning discrepancy)
4. Incorrect maturity date (Critical discrepancy)
5. Missing lien endorsement (Regulatory critical discrepancy)
6. Unreadable / Empty document (Ingestion failure)
7. Low OCR confidence (Manual review warning)
8. Malformed / Corrupted PDF (Structural parsing failure)
"""
import io
import os
import sys
import unittest
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Set SQLite database for testing
os.environ["DATABASE_URL"] = "sqlite:///./fdr_smart.db"

import pymupdf
from app.modules.documents.storage import (
    validate_document_upload,
    detect_file_signature,
    store_document,
)
from app.modules.document_processing.ocr_service import (
    extract_fields_from_text,
    normalize_indian_currency,
    normalize_date_string,
    process_document_ocr,
)
from app.modules.verification.discrepancy_detector import (
    detect_discrepancies,
    resolve_discrepancy,
    DEFAULT_POLICY,
)

def create_synthetic_pdf(text_lines: list[str]) -> bytes:
    """Creates a genuine PDF byte stream containing specified text lines."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4
    y = 50
    for line in text_lines:
        page.insert_text((50, y), line, fontsize=11)
        y += 24
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

class TestVerificationPipeline(unittest.TestCase):

    def setUp(self):
        self.submitted_base = {
            "fdrNumber": "FDR/AICTE/2026/089",
            "bankName": "State Bank of India",
            "ifscCode": "SBIN0001256",
            "principalAmount": 5000000.0,
            "institutionName": "Delhi Technological University",
            "issueDate": "2024-03-15",
            "maturityDate": "2026-11-20",
        }

    def test_01_clean_matching_fields(self):
        """Scenario 1: Document with matching fields (100% Concordance)"""
        text_lines = [
            "STATE BANK OF INDIA",
            "Kashmere Gate Branch, Delhi-110006",
            "IFSC: SBIN0001256",
            "FIXED DEPOSIT RECEIPT",
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Received from: Delhi Technological University",
            "Principal Amount: Rs. 50,00,000.00",
            "Interest Rate: 7.25% p.a.",
            "Maturity Date: 20/11/2026",
            "Maturity Value: Rs. 53,62,500.00",
            "Lien Marked in favour of: Member Secretary, AICTE, New Delhi",
        ]
        pdf_bytes = create_synthetic_pdf(text_lines)
        
        # Ingestion signature check
        sig = detect_file_signature(pdf_bytes)
        self.assertEqual(sig, "application/pdf")
        
        # Extraction
        extracted = extract_fields_from_text("\n".join(text_lines))
        self.assertEqual(extracted["reference_number"].value, "FDR/AICTE/2026/089")
        self.assertEqual(extracted["bank_name"].value, "State Bank of India")
        self.assertEqual(extracted["ifsc_code"].value, "SBIN0001256")
        self.assertEqual(extracted["amount"].value, 5000000.0)
        self.assertEqual(extracted["issue_date"].value, "2024-03-15")
        self.assertEqual(extracted["maturity_date"].value, "2026-11-20")
        self.assertIn("Member Secretary", extracted["lien_beneficiary"].value)
        
        # Discrepancy Detection
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-01",
            verification_id="test-verif-01",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        self.assertEqual(len(discrepancies), 0, f"Expected 0 discrepancies but got: {discrepancies}")

    def test_02_principal_amount_mismatch(self):
        """Scenario 2: Principal Amount Mismatch (CRITICAL)"""
        text_lines = [
            "STATE BANK OF INDIA",
            "IFSC: SBIN0001256",
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Received from: Delhi Technological University",
            "Principal Amount: Rs. 30,00,000.00",  # Submitted 50L
            "Maturity Date: 20/11/2026",
            "Lien Marked in favour of: Member Secretary, AICTE, New Delhi",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-02",
            verification_id="test-verif-02",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        amt_discs = [d for d in discrepancies if d.field_name == "principal_amount"]
        self.assertEqual(len(amt_discs), 1)
        self.assertEqual(amt_discs[0].severity, "CRITICAL")
        self.assertIn("30,00,000", amt_discs[0].observed_value)

    def test_03_ifsc_code_mismatch(self):
        """Scenario 3: IFSC Code Mismatch (WARNING)"""
        text_lines = [
            "STATE BANK OF INDIA",
            "IFSC: SBIN0999999",  # Submitted SBIN0001256
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Received from: Delhi Technological University",
            "Principal Amount: Rs. 50,00,000.00",
            "Maturity Date: 20/11/2026",
            "Lien Marked in favour of: Member Secretary, AICTE, New Delhi",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-03",
            verification_id="test-verif-03",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        ifsc_discs = [d for d in discrepancies if d.field_name == "ifsc_code"]
        self.assertEqual(len(ifsc_discs), 1)
        self.assertEqual(ifsc_discs[0].severity, "WARNING")
        self.assertEqual(ifsc_discs[0].observed_value, "SBIN0999999")

    def test_04_incorrect_maturity_date(self):
        """Scenario 4: Incorrect Maturity Date (CRITICAL)"""
        text_lines = [
            "STATE BANK OF INDIA",
            "IFSC: SBIN0001256",
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Received from: Delhi Technological University",
            "Principal Amount: Rs. 50,00,000.00",
            "Maturity Date: 05/11/2026",  # Submitted 2026-11-20
            "Lien Marked in favour of: Member Secretary, AICTE, New Delhi",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-04",
            verification_id="test-verif-04",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        date_discs = [d for d in discrepancies if d.field_name == "maturity_date"]
        self.assertEqual(len(date_discs), 1)
        self.assertEqual(date_discs[0].severity, "CRITICAL")
        self.assertEqual(date_discs[0].observed_value, "2026-11-05")

    def test_05_missing_lien_wording(self):
        """Scenario 5: Missing or Invalid Lien Endorsement (CRITICAL)"""
        text_lines = [
            "STATE BANK OF INDIA",
            "IFSC: SBIN0001256",
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Received from: Delhi Technological University",
            "Principal Amount: Rs. 50,00,000.00",
            "Maturity Date: 20/11/2026",
            "Lien Endorsement: Branch Manager Digital Signature Token Missing",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-05",
            verification_id="test-verif-05",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        lien_discs = [d for d in discrepancies if d.field_name == "lien_endorsement"]
        self.assertEqual(len(lien_discs), 1)
        self.assertEqual(lien_discs[0].severity, "CRITICAL")
        self.assertIn("Token Missing", lien_discs[0].observed_value)

    def test_06_unreadable_empty_document(self):
        """Scenario 6: Empty (0 bytes) document rejection"""
        empty_content = b""
        with self.assertRaises(ValueError) as ctx:
            validate_document_upload(empty_content, "empty.pdf", "application/pdf")
        self.assertIn("cannot be empty", str(ctx.exception))

    def test_07_low_ocr_confidence(self):
        """Scenario 7: Low OCR Confidence (< 70%) Warning"""
        text_lines = [
            "ST..E B..K OF IN..A",
            "IFSC: SBIN0001256",
            "FDR: ???",
            "Date: 15/03/2024",
            "Amount: Rs. 50,00,000.00",
            "Maturity Date: 20/11/2026",
            "Lien Marked in favour of: AICTE",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        # Deliberately lower individual confidences
        for f in extracted.values():
            f.confidence = 0.45
            
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-07",
            verification_id="test-verif-07",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        conf_discs = [d for d in discrepancies if d.field_name == "ocr_confidence"]
        self.assertEqual(len(conf_discs), 1)
        self.assertEqual(conf_discs[0].severity, "WARNING")
        self.assertIn("Low OCR confidence", conf_discs[0].resolution_notes)

    def test_08_malformed_corrupted_pdf(self):
        """Scenario 8: Malformed or Corrupted PDF handling"""
        corrupted_pdf = b"%PDF-1.4\ncorrupted_trailer_xref_broken\x00\xFF"
        with self.assertRaises(ValueError) as ctx:
            validate_document_upload(corrupted_pdf, "corrupted.pdf", "application/pdf")
        self.assertIn("Malformed or corrupted", str(ctx.exception))

    def test_09_discrepancy_resolution_audit(self):
        """Scenario 9: Discrepancy Resolution & Audit Trail Retention"""
        text_lines = [
            "STATE BANK OF INDIA",
            "IFSC: SBIN0999999",  # Mismatch
            "Receipt No: FDR/AICTE/2026/089",
            "Date of Issue: 15/03/2024",
            "Principal Amount: Rs. 50,00,000.00",
            "Maturity Date: 20/11/2026",
            "Lien Marked in favour of: Member Secretary, AICTE, New Delhi",
        ]
        extracted = extract_fields_from_text("\n".join(text_lines))
        discrepancies = detect_discrepancies(
            instrument_id="test-inst-09",
            verification_id="test-verif-09",
            submitted_data=self.submitted_base,
            extracted_fields=extracted,
        )
        self.assertGreater(len(discrepancies), 0)
        disc_id = discrepancies[0].id
        
        # Resolve discrepancy
        resolved = resolve_discrepancy(
            discrepancy_id=disc_id,
            status="resolved",
            notes="Branch clarification letter received confirming new IFSC.",
            resolver_user_id="anil.verma@aicte.gov.in"
        )
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved.resolution_status, "resolved")
        self.assertEqual(resolved.resolved_by_user_id, "anil.verma@aicte.gov.in")

if __name__ == "__main__":
    unittest.main(verbosity=2)

