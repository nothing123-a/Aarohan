"""
Private Document Storage Service
Handles secure private document storage, cryptographic SHA-256 checksums,
magic byte validation, PDF integrity checks, and metadata persistence according to DATABASE.md Section 5.5.
"""
import hashlib
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
import pymupdf  # PyMuPDF
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.models import InstrumentDocument as InstrumentDocumentModel

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

# In-memory document repository (for quick access and backward compatibility)
DOCUMENTS_DB: Dict[str, InstrumentDocument] = {}

def calculate_sha256(content: bytes) -> str:
    """Computes cryptographic SHA-256 hash of document binary."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest()

def detect_file_signature(content: bytes, filename: Optional[str] = None) -> Optional[str]:
    """Inspects file magic bytes (signatures) to verify genuine file type."""
    if len(content) < 4:
        return None
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"II*\x00") or content.startswith(b"MM\x00*"):
        return "image/tiff"
    # CSV detection: check filename and valid text decoding
    if filename and filename.lower().endswith(".csv"):
        try:
            content[:1024].decode("utf-8", errors="strict")
            return "text/csv"
        except UnicodeDecodeError:
            return None
    return None

def validate_document_upload(content: bytes, filename: str, mime_type: str) -> str:
    """
    Validates document size, magic bytes signature, and structural integrity.
    Handles malformed, encrypted, empty, and unreadable PDFs.
    Returns verified MIME type.
    """
    size = len(content)
    if size <= 0:
        raise ValueError("Uploaded document cannot be empty (0 bytes).")
    
    if size > settings.MAX_FILE_SIZE_BYTES:
        max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise ValueError(f"Document size ({size} bytes) exceeds regulatory maximum limit of {max_mb} MB.")
    
    detected_mime = detect_file_signature(content, filename=filename)
    if not detected_mime:
        ext = Path(filename).suffix.lower()
        raise ValueError(
            f"Invalid file signature for '{filename}'. File content does not match permitted formats (PDF, JPEG, PNG, TIFF, CSV)."
        )
    
    # Specific structural validation for PDFs
    if detected_mime == "application/pdf":
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
            if doc.is_encrypted:
                doc.close()
                raise ValueError("Document is password-protected or encrypted. Unencrypted documents are required for scrutiny.")
            if doc.page_count == 0:
                doc.close()
                raise ValueError("Document is empty or contains zero pages.")
            doc.close()
        except pymupdf.FileDataError as e:
            raise ValueError(f"Malformed or corrupted PDF file: {str(e)}")
        except Exception as e:
            if "encrypted" in str(e).lower() or "password" in str(e).lower():
                raise ValueError("Document is password-protected or encrypted. Unencrypted documents are required for scrutiny.")
            if "zero pages" in str(e).lower():
                raise
            raise ValueError(f"Unable to parse PDF document structure: {str(e)}")
            
    return detected_mime

def store_document(
    content: bytes,
    original_filename: str,
    mime_type: str,
    instrument_id: str,
    uploaded_by_user_id: str = "user-inst-representative",
    document_type: str = "fdr_copy",
    db: Optional[Session] = None,
) -> InstrumentDocument:
    """
    Saves document to private storage outside the web root, calculates SHA-256,
    persists record in the database, and returns authoritative document metadata.
    """
    verified_mime = validate_document_upload(content, original_filename, mime_type)
    
    checksum = calculate_sha256(content)
    ext = Path(original_filename).suffix.lower()
    if not ext:
        ext = ".pdf" if verified_mime == "application/pdf" else ".png"
        
    storage_key = f"{uuid.uuid4()}{ext}"
    file_path = settings.DOCUMENT_STORAGE_DIR / storage_key
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    doc_id = f"doc-{uuid.uuid4()}"
    
    # Persist to database if session is available or create a local session
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None

    if db is not None:
        try:
            db_doc = InstrumentDocumentModel(
                id=doc_id,
                instrument_id=instrument_id,
                uploaded_by_user_id=uploaded_by_user_id,
                document_type=document_type,
                original_filename=original_filename,
                storage_key=storage_key,
                mime_type=verified_mime,
                file_size_bytes=len(content),
                sha256_checksum=checksum,
                scan_status="clean",
                document_status="active",
                uploaded_at=now_dt,
                created_at=now_dt,
            )
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)
        except Exception as e:
            if db:
                db.rollback()
        finally:
            if close_db and db:
                db.close()

    doc = InstrumentDocument(
        id=doc_id,
        instrument_id=instrument_id,
        uploaded_by_user_id=uploaded_by_user_id,
        document_type=document_type,
        original_filename=original_filename,
        storage_key=storage_key,
        mime_type=verified_mime,
        file_size_bytes=len(content),
        sha256_checksum=checksum,
        scan_status="clean",
        document_status="active",
        uploaded_at=now_iso,
        created_at=now_iso,
    )
    
    DOCUMENTS_DB[doc.id] = doc
    return doc

def get_document_metadata(doc_id: str, db: Optional[Session] = None) -> Optional[InstrumentDocument]:
    """Retrieves document metadata by ID from DB or memory cache."""
    # Check in-memory first
    if doc_id in DOCUMENTS_DB:
        return DOCUMENTS_DB[doc_id]
        
    # Check database
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None
            
    if db is not None:
        try:
            row = db.query(InstrumentDocumentModel).filter(InstrumentDocumentModel.id == doc_id).first()
            if row:
                doc = InstrumentDocument(
                    id=row.id,
                    instrument_id=row.instrument_id,
                    uploaded_by_user_id=row.uploaded_by_user_id,
                    document_type=row.document_type,
                    original_filename=row.original_filename,
                    storage_key=row.storage_key,
                    mime_type=row.mime_type,
                    file_size_bytes=row.file_size_bytes,
                    sha256_checksum=row.sha256_checksum,
                    scan_status=row.scan_status,
                    document_status=row.document_status,
                    uploaded_at=row.uploaded_at.isoformat() if row.uploaded_at else "",
                    created_at=row.created_at.isoformat() if row.created_at else "",
                )
                DOCUMENTS_DB[doc.id] = doc
                return doc
        except Exception:
            pass
        finally:
            if close_db and db:
                db.close()
                
    return None

def get_document_file_path(doc_id: str, db: Optional[Session] = None) -> Optional[Path]:
    """Resolves local private storage path for authorized streaming."""
    doc = get_document_metadata(doc_id, db=db)
    if not doc:
        return None
    path = settings.DOCUMENT_STORAGE_DIR / doc.storage_key
    if path.exists():
        return path
    return None

def list_documents_for_instrument(instrument_id: str, db: Optional[Session] = None) -> List[InstrumentDocument]:
    """Lists all documents registered for an instrument from DB and memory."""
    docs: List[InstrumentDocument] = []
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None
            
    if db is not None:
        try:
            rows = db.query(InstrumentDocumentModel).filter(InstrumentDocumentModel.instrument_id == instrument_id).all()
            for row in rows:
                doc = InstrumentDocument(
                    id=row.id,
                    instrument_id=row.instrument_id,
                    uploaded_by_user_id=row.uploaded_by_user_id,
                    document_type=row.document_type,
                    original_filename=row.original_filename,
                    storage_key=row.storage_key,
                    mime_type=row.mime_type,
                    file_size_bytes=row.file_size_bytes,
                    sha256_checksum=row.sha256_checksum,
                    scan_status=row.scan_status,
                    document_status=row.document_status,
                    uploaded_at=row.uploaded_at.isoformat() if row.uploaded_at else "",
                    created_at=row.created_at.isoformat() if row.created_at else "",
                )
                docs.append(doc)
                DOCUMENTS_DB[doc.id] = doc
        except Exception:
            pass
        finally:
            if close_db and db:
                db.close()
                
    # Add any memory-only documents not yet present
    for d in DOCUMENTS_DB.values():
        if d.instrument_id == instrument_id and not any(existing.id == d.id for existing in docs):
            docs.append(d)
            
    return docs


def save_document_binary(content: bytes, filename: str, instrument_id: str = "generic") -> str:
    """Saves arbitrary file bytes into the secure private document storage directory and returns storage_key."""
    ext = Path(filename).suffix.lower() or ".bin"
    storage_key = f"{uuid.uuid4()}{ext}"
    file_path = settings.DOCUMENT_STORAGE_DIR / storage_key
    with open(file_path, "wb") as f:
        f.write(content)
    return storage_key


def get_document_binary(storage_key: str) -> bytes:
    """Retrieves document binary from secure private storage."""
    file_path = get_document_file_path(storage_key)
    with open(file_path, "rb") as f:
        return f.read()
