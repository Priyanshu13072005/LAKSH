"""
LAKSH Backend - Database session configuration.
SQLAlchemy engine and session factory with automatic MySQL / SQLite fallback.
"""

from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings


import os
import re

DB_INIT_ERROR = None
DB_ATTEMPTED_URL_MASKED = None


def _mask_url(url: str) -> str:
    if not url:
        return "None"
    # Hide password in connection strings
    return re.sub(r":([^:@/]+)@", r":***@", url)


def _get_candidate_db_url() -> str:
    url = (
        os.environ.get("DATABASE_URL")
        or getattr(settings, "DATABASE_URL", None)
        or os.environ.get("DATABASE_URL_OVERRIDE")
        or getattr(settings, "DATABASE_URL_OVERRIDE", None)
    )
    if url:
        url = url.strip().strip("'").strip('"')
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url
    return settings.effective_database_url


def _create_database_engine():
    global DB_INIT_ERROR, DB_ATTEMPTED_URL_MASKED
    db_url = _get_candidate_db_url()
    DB_ATTEMPTED_URL_MASKED = _mask_url(db_url)

    if not db_url.startswith("sqlite"):
        # Strategy list to attempt connection
        connection_attempts = []
        is_postgres = "postgres" in db_url

        if is_postgres:
            # Attempt 1: Standard connection with timeout
            connection_attempts.append({"connect_timeout": 7})
            # Attempt 2: If sslmode not in URL, try with sslmode=prefer or require
            if "sslmode" not in db_url:
                connection_attempts.append({"connect_timeout": 7, "sslmode": "prefer"})
                connection_attempts.append({"connect_timeout": 7, "sslmode": "require"})
        elif "mysql" in db_url:
            connection_attempts.append({"connect_timeout": 5})
        else:
            connection_attempts.append({})

        last_error = None
        for conn_args in connection_attempts:
            try:
                test_engine = create_engine(
                    db_url,
                    connect_args=conn_args,
                    pool_pre_ping=True,
                    pool_size=10,
                    max_overflow=20,
                )
                with test_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                dialect = test_engine.dialect.name
                print(f"[DB] Successfully connected to persistent {dialect.upper()} database.")
                DB_INIT_ERROR = None
                return test_engine
            except Exception as e:
                last_error = e

        DB_INIT_ERROR = f"{type(last_error).__name__}: {str(last_error)}"
        print(f"[DB] Configured database ({DB_ATTEMPTED_URL_MASKED}) is not reachable: {DB_INIT_ERROR}")
        print(f"[DB] Seamlessly falling back to local SQLite database (laksh.db)...")
        base_dir = Path(__file__).resolve().parent.parent.parent
        sqlite_path = base_dir / "laksh.db"
        sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"
        return create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
        )
    else:
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )


engine = _create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
