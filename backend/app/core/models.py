"""
FDR-SMART Core SQLAlchemy 2.x Models
Implements all 13 core database entities defined in DATABASE.md:
1. institutions
2. users
3. institution_memberships
4. financial_instruments
5. instrument_documents
6. document_extraction_runs
7. instrument_verifications
8. verification_discrepancies
9. instrument_lifecycle_events
10. release_refund_requests
11. release_refund_decisions
12. notifications
13. audit_events
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Date,
    DateTime,
    BigInteger,
    ForeignKey,
    JSON,
    Integer,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Institution(Base):
    """
    Stores institution identity and administrative registration information.
    DATABASE.md Section 5.1
    """
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    institution_type = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    contact_email = Column(String(254), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    approved_intake = Column(Integer, nullable=True, default=0)
    total_deposit_required = Column(Numeric(18, 2), nullable=True, default=0.0)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    memberships = relationship("InstitutionMembership", back_populates="institution")
    instruments = relationship("FinancialInstrument", back_populates="institution")


class User(Base):
    """
    Stores application-level user profiles.
    DATABASE.md Section 5.2
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    auth_provider = Column(String(50), nullable=False, default="local")
    auth_subject = Column(String(255), nullable=True)
    email = Column(String(254), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=False)
    role = Column(String(40), nullable=False, default="institution_representative")
    status = Column(String(20), nullable=False, default="active")
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    memberships = relationship("InstitutionMembership", back_populates="user")
    submitted_instruments = relationship("FinancialInstrument", back_populates="submitted_by_user", foreign_keys="FinancialInstrument.submitted_by_user_id")
    notifications = relationship("Notification", back_populates="recipient_user")


class InstitutionMembership(Base):
    """
    Associates users with institutions they are authorized to represent or administer.
    DATABASE.md Section 5.3
    """
    __tablename__ = "institution_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(40), nullable=False, default="institution_representative")
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", back_populates="memberships")
    user = relationship("User", back_populates="memberships")


class FinancialInstrument(Base):
    """
    Central table for FDRs and other approved security deposit instruments.
    DATABASE.md Section 5.4
    """
    __tablename__ = "financial_instruments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    reference_number = Column(String(100), nullable=False, index=True)
    instrument_type = Column(String(30), nullable=False, default="fdr")
    bank_name = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    interest_rate = Column(Numeric(5, 2), nullable=True)
    maturity_amount = Column(Numeric(18, 2), nullable=True)
    issue_date = Column(Date, nullable=True)
    maturity_date = Column(Date, nullable=True, index=True)
    tenure_months = Column(Integer, nullable=True)
    purpose = Column(String(100), nullable=True, default="security_deposit")
    contract_number = Column(String(100), nullable=True)
    project_name = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    submission_status = Column(String(30), nullable=False, default="draft")  # draft, submitted, returned_for_correction, resubmitted
    verification_status = Column(String(30), nullable=False, default="not_started")  # not_started, pending, in_review, verified, discrepancy_found, rejected
    lifecycle_status = Column(String(30), nullable=False, default="active")  # active, matured, renewal_pending, replacement_pending, released, closed
    predecessor_instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    submitted_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", back_populates="instruments")
    submitted_by_user = relationship("User", back_populates="submitted_instruments", foreign_keys=[submitted_by_user_id])
    documents = relationship("InstrumentDocument", back_populates="instrument", cascade="all, delete-orphan")
    verifications = relationship("InstrumentVerification", back_populates="instrument")
    lifecycle_events = relationship("InstrumentLifecycleEvent", back_populates="instrument", foreign_keys="InstrumentLifecycleEvent.instrument_id")
    release_requests = relationship("ReleaseRefundRequest", back_populates="instrument")
    predecessor = relationship("FinancialInstrument", remote_side=[id], foreign_keys=[predecessor_instrument_id])


class InstrumentDocument(Base):
    """
    Metadata and private storage references for uploaded documents.
    DATABASE.md Section 5.5
    """
    __tablename__ = "instrument_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    document_type = Column(String(40), nullable=False, default="fdr_copy")
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    scan_status = Column(String(20), nullable=False, default="clean")
    document_status = Column(String(20), nullable=False, default="active")
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="documents")
    extraction_runs = relationship("DocumentExtractionRun", back_populates="document", cascade="all, delete-orphan")


class DocumentExtractionRun(Base):
    """
    OCR and automated document extraction records.
    DATABASE.md Section 5.6
    """
    __tablename__ = "document_extraction_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("instrument_documents.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="queued")  # queued, processing, completed, failed
    processor_name = Column(String(100), nullable=False, default="PyMuPDF+Tesseract")
    processor_version = Column(String(100), nullable=True, default="1.0.0")
    extracted_fields = Column(JSON, nullable=True)
    raw_text = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    document = relationship("InstrumentDocument", back_populates="extraction_runs")


class InstrumentVerification(Base):
    """
    Records human review and regulatory verification outcomes.
    DATABASE.md Section 5.7
    """
    __tablename__ = "instrument_verifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    outcome = Column(String(30), nullable=False)  # verified, discrepancy_found, returned_for_correction, rejected
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="verifications")
    discrepancies = relationship("VerificationDiscrepancy", back_populates="verification")


class VerificationDiscrepancy(Base):
    """
    Records differences discovered during review between submitted and extracted/confirmed data.
    DATABASE.md Section 5.8
    """
    __tablename__ = "verification_discrepancies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    verification_id = Column(String(36), ForeignKey("instrument_verifications.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    source_type = Column(String(30), nullable=False, default="extracted")
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    resolution_status = Column(String(30), nullable=False, default="open")  # open, resolved, accepted_with_explanation, not_applicable
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    verification = relationship("InstrumentVerification", back_populates="discrepancies")


class InstrumentLifecycleEvent(Base):
    """
    Preserves significant instrument lifecycle changes (business milestones).
    DATABASE.md Section 5.9
    """
    __tablename__ = "instrument_lifecycle_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    event_type = Column(String(40), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    related_instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    initiated_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    event_notes = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", foreign_keys=[instrument_id], back_populates="lifecycle_events")


class ReleaseRefundRequest(Base):
    """
    Stores requests to release or refund a security deposit or FDR.
    DATABASE.md Section 5.10
    """
    __tablename__ = "release_refund_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    requested_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    request_type = Column(String(30), nullable=False, default="release")  # release, refund, noc_issuance
    status = Column(String(30), nullable=False, default="submitted")  # draft, submitted, under_review, approved, rejected, completed
    reason = Column(Text, nullable=False)
    regulatory_clause = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="release_requests")
    decisions = relationship("ReleaseRefundDecision", back_populates="request")


class ReleaseRefundDecision(Base):
    """
    Preserves decisions made on release/refund requests.
    DATABASE.md Section 5.11
    """
    __tablename__ = "release_refund_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), ForeignKey("release_refund_requests.id"), nullable=False, index=True)
    decided_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    decision = Column(String(30), nullable=False)  # approved, rejected, returned_for_correction
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    request = relationship("ReleaseRefundRequest", back_populates="decisions")


class Notification(Base):
    """
    Stores user-facing notification records.
    DATABASE.md Section 5.12
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    request_id = Column(String(36), ForeignKey("release_refund_requests.id"), nullable=True)
    notification_type = Column(String(50), nullable=False, default="info")
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    recipient_user = relationship("User", back_populates="notifications")


class AuditEvent(Base):
    """
    Append-only security and compliance audit logs.
    DATABASE.md Section 5.13
    """
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(80), nullable=False)
    entity_id = Column(String(36), nullable=True)
    outcome = Column(String(20), nullable=False, default="success")  # success, failure, denied
    correlation_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
