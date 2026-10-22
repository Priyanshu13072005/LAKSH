"""
LAKSH Backend - Database session configuration.
SQLAlchemy engine and session factory with automatic MySQL / SQLite fallback.
"""

from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.core.config import settings


def _create_database_engine():
    db_url = settings.effective_database_url
    if not db_url.startswith("sqlite"):
        try:
            # Appropriate connection timeouts based on driver
            connect_args = {}
            if "mysql" in db_url:
                connect_args = {"connect_timeout": 5}
            elif "postgres" in db_url:
                connect_args = {"connect_timeout": 5}

            test_engine = create_engine(
                db_url,
                connect_args=connect_args,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            dialect = test_engine.dialect.name
            print(f"[DB] Successfully connected to persistent {dialect.upper()} database.")
            return test_engine
        except Exception as e:
            print(f"[DB] Configured database is not reachable ({type(e).__name__}: {e}).")
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
