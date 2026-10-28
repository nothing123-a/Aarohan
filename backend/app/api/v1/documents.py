"""
Documents API Endpoints
Handles secure document upload, magic byte verification, private streaming,
and automated OCR extraction according to API.md.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import FileResponse
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.documents.storage import (
    store_document,
    get_document_metadata,
    get_document_file_path,
    list_documents_for_instrument,
    InstrumentDocument,
)
from app.modules.document_processing.ocr_service import (
    process_document_ocr,
    get_latest_extraction_run,
    DocumentExtractionRun,
)

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    instrument_id: str = Form(...),
    document_type: str = Form("fdr_copy"),
    uploaded_by_user_id: str = Form("user-rep-dtu"),
    db: Session = Depends(get_db),
):
    """
    Secure document upload endpoint.
    Validates magic bytes & size (<15MB), stores file in private object repository,
    computes SHA-256 hash, and initiates automated OCR field extraction with DB persistence.
    """
    content = await file.read()
    filename = file.filename or "uploaded_document.pdf"
    content_type = file.content_type or "application/pdf"
    
    try:
        doc = store_document(
            content=content,
            original_filename=filename,
            mime_type=content_type,
            instrument_id=instrument_id,
            uploaded_by_user_id=uploaded_by_user_id,
            document_type=document_type,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    # Run automated OCR processing
    file_path = get_document_file_path(doc.id, db=db)
    extraction_run = None
    if file_path:
        extraction_run = process_document_ocr(
            document_id=doc.id,
            file_path=file_path,
            original_filename=doc.original_filename,
            db=db,
        )
        
    return {
        "success": True,
        "message": "Document securely stored and processed by OCR verification engine.",
        "document": doc.model_dump(),
        "extraction_run": extraction_run.model_dump() if extraction_run else None,
    }

@router.get("/{document_id}", response_model=InstrumentDocument)
async def get_document(document_id: str, db: Session = Depends(get_db)):
    """Retrieves document metadata by ID."""
    doc = get_document_metadata(document_id, db=db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document metadata not found.")
    return doc

@router.get("/{document_id}/download")
async def download_document(document_id: str, db: Session = Depends(get_db)):
    """
    Authorized private streaming response.
    Never exposes internal storage keys or public URLs to clients.
    """
    doc = get_document_metadata(document_id, db=db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    file_path = get_document_file_path(document_id, db=db)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Document content not available on disk.")
        
    return FileResponse(
        path=str(file_path),
        filename=doc.original_filename,
        media_type=doc.mime_type,
        headers={"Cache-Control": "private, no-cache, no-store, must-revalidate"},
    )

@router.get("/{document_id}/extraction-run", response_model=Optional[DocumentExtractionRun])
async def get_extraction_run(document_id: str, db: Session = Depends(get_db)):
    """Retrieves the latest OCR extraction run for this document."""
    run = get_latest_extraction_run(document_id, db=db)
    if not run:
        raise HTTPException(status_code=404, detail="No extraction run found for document.")
    return run

@router.get("/instrument/{instrument_id}", response_model=list[InstrumentDocument])
async def get_instrument_documents(instrument_id: str, db: Session = Depends(get_db)):
    """Lists all stored documents for a given instrument."""
    return list_documents_for_instrument(instrument_id, db=db)
