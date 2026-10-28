"""
FDR-SMART Database Engine & Session Factory
SQLAlchemy 2.x configuration according to ARCHITECTURE.md and DATABASE.md.
Supports PostgreSQL (primary) with resilient fallback for offline evaluation.
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("fdr_smart.database")

Base = declarative_base()

def create_db_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    try:
        if db_url.startswith("postgresql"):
            # Test connectivity quickly
            test_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            with test_engine.connect() as conn:
                logger.info("Successfully connected to PostgreSQL database.")
            return test_engine
    except Exception as e:
        logger.warning(
            f"PostgreSQL connection to {db_url} failed ({e}). "
            "Falling back to local SQLite database 'fdr_smart.db' for continuous local operation."
        )
    
    # Fallback to SQLite with thread safety
    sqlite_url = "sqlite:///./fdr_smart.db"
    return create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

engine = create_db_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI Dependency for database session management."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
