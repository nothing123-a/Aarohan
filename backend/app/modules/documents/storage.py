"""
Private Document Storage Service
Handles secure private document storage, cryptographic SHA-256 checksums,
MIME validation, and metadata persistence according to DATABASE.md Section 5.5.
"""
import hashlib
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings

class InstrumentDocument(BaseModel):
    id: str = Field(default_factory=lambda: f"doc-{uuid.uuid4()}")
    instrument_id: str
    uploaded_by_user_id: str
    document_type: str = "fdr_copy"
    original_filename: str
    storage_key: str
    mime_type: str
    file_size_bytes: int
    sha256_checksum: str
    scan_status: str = "clean"  # "pending", "clean", "quarantined", "rejected"
    document_status: str = "active"  # "active", "superseded"
    uploaded_at: str
    created_at: str

# In-memory document repository (backing storage metadata)
DOCUMENTS_DB: Dict[str, InstrumentDocument] = {}

def calculate_sha256(content: bytes) -> str:
    """Computes cryptographic SHA-256 hash of document binary."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest()

def validate_document_upload(content: bytes, filename: str, mime_type: str) -> None:
    """Validates document size and media type against regulatory security rules."""
    size = len(content)
    if size <= 0:
        raise ValueError("Uploaded document cannot be empty (0 bytes).")
    
    if size > settings.MAX_FILE_SIZE_BYTES:
        max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise ValueError(f"Document size ({size} bytes) exceeds regulatory maximum limit of {max_mb} MB.")
    
    # Check mime type
    if mime_type.lower() not in settings.ALLOWED_MIME_TYPES:
        # Also check file extension
        ext = Path(filename).suffix.lower()
        valid_exts = {".pdf", ".png", ".jpg", ".jpeg", ".tiff"}
        if ext not in valid_exts:
            raise ValueError(f"Prohibited file format: '{mime_type}'. Only PDF, JPEG, PNG, and TIFF are permitted.")

def store_document(
    content: bytes,
    original_filename: str,
    mime_type: str,
    instrument_id: str,
    uploaded_by_user_id: str = "user-inst-representative",
    document_type: str = "fdr_copy",
) -> InstrumentDocument:
    """
    Saves document to private storage outside the web root, calculates SHA-256,
    and returns authoritative document metadata.
    """
    validate_document_upload(content, original_filename, mime_type)
    
    checksum = calculate_sha256(content)
    ext = Path(original_filename).suffix.lower() or ".pdf"
    storage_key = f"{uuid.uuid4()}{ext}"
    
    file_path = settings.DOCUMENT_STORAGE_DIR / storage_key
    with open(file_path, "wb") as f:
        f.write(content)
    
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = InstrumentDocument(
        instrument_id=instrument_id,
        uploaded_by_user_id=uploaded_by_user_id,
        document_type=document_type,
        original_filename=original_filename,
        storage_key=storage_key,
        mime_type=mime_type,
        file_size_bytes=len(content),
        sha256_checksum=checksum,
        scan_status="clean",
        document_status="active",
        uploaded_at=now_iso,
        created_at=now_iso,
    )
    
    DOCUMENTS_DB[doc.id] = doc
    return doc

def get_document_metadata(doc_id: str) -> Optional[InstrumentDocument]:
    """Retrieves document metadata by ID."""
    return DOCUMENTS_DB.get(doc_id)

def get_document_file_path(doc_id: str) -> Optional[Path]:
    """Resolves local private storage path for authorized streaming."""
    doc = DOCUMENTS_DB.get(doc_id)
    if not doc:
        return None
    path = settings.DOCUMENT_STORAGE_DIR / doc.storage_key
    if path.exists():
        return path
    return None

def list_documents_for_instrument(instrument_id: str) -> List[InstrumentDocument]:
    """Lists all documents registered for an instrument."""
    return [d for d in DOCUMENTS_DB.values() if d.instrument_id == instrument_id]
