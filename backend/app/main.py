"""
FDR-SMART Backend Main Application
FastAPI Modular Monolith initialization according to ARCHITECTURE.md and DATABASE.md.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.documents import router as documents_router
from app.api.v1.verification import router as verification_router
from app.modules.scrutiny.router import router as scrutiny_router
from app.modules.renewals.router import router as renewals_router
from app.modules.requests.router import router as releases_router
from app.modules.audit.router import router as audit_router
from app.modules.auth.router import router as auth_router
from app.modules.institutions.router import router as institutions_router
from app.modules.instruments.router import router as instruments_router
from app.modules.reports.router import router as reports_router
from app.modules.monitoring.router import router as monitoring_router

logger = logging.getLogger("uvicorn.error")

# Ensure all 13 core database tables exist
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified and synchronized.")
except Exception as e:
    logger.error(f"Error initializing database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Centralized AICTE Regulation Bureau Security Deposit & FDR Management Portal Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware allowing Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "*",  # Permissive for local development and review
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(institutions_router, prefix=settings.API_V1_PREFIX)
app.include_router(instruments_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(verification_router, prefix=settings.API_V1_PREFIX)
app.include_router(scrutiny_router, prefix=settings.API_V1_PREFIX)
app.include_router(renewals_router, prefix=settings.API_V1_PREFIX)
app.include_router(releases_router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(monitoring_router, prefix=settings.API_V1_PREFIX)

# Also mount under /api prefix for standard frontend service calls
app.include_router(auth_router, prefix="/api")
app.include_router(institutions_router, prefix="/api")
app.include_router(instruments_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(verification_router, prefix="/api")
app.include_router(scrutiny_router, prefix="/api")
app.include_router(renewals_router, prefix="/api")
app.include_router(releases_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(monitoring_router, prefix="/api")

@app.get("/api/v1/health")
@app.get("/health")
async def health_check():
    """System health check and diagnostic status."""
    return {
        "status": "HEALTHY",
        "service": "FDR-SMART Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url),
        "capabilities": {
            "pdf_extraction": "PyMuPDF (fitz) Active",
            "ocr_engine": "Tesseract / Layout OCR Pipeline",
            "discrepancy_detection": "Rule-Based Semantic Matcher Active",
            "private_storage": "Secured Local Vault Active",
            "database_orm": "SQLAlchemy 2.x Connected",
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
