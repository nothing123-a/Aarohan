"""
FDR-SMART Backend Configuration
Defines settings, security constraints, and document storage paths according to ARCHITECTURE.md and DATABASE.md.
"""
import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage" / "documents"

class Settings(BaseModel):
    PROJECT_NAME: str = "FDR-SMART Backend"
    API_V1_PREFIX: str = "/api/v1"
    
    # Document storage & security constraints per PRD & DATABASE.md
    DOCUMENT_STORAGE_DIR: Path = STORAGE_DIR
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB limit
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/tiff",
    ]
    
    # Database configuration per ARCHITECTURE.md and DATABASE.md
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/fdr_smart"
    )

    # JWT Authentication settings
    # ⚠️  SECURITY: Set JWT_SECRET env var to a strong random value before any deployment.
    # The fallback below is for LOCAL DEVELOPMENT / SIH DEMO ONLY.
    # Generate a secure key: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "aicte-fdr-smart-demo-jwt-key-change-before-any-deployment")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours


    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

settings = Settings()

# Ensure private document storage directory exists
os.makedirs(settings.DOCUMENT_STORAGE_DIR, exist_ok=True)
