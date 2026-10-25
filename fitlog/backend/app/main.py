"""
LAKSH - Main FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import engine, SessionLocal, DB_INIT_ERROR, DB_ATTEMPTED_URL_MASKED
from app.db.base import Base
import app.models  # Ensure all models are registered
from app.db.seed import seed_exercises

from app.routers import (
    auth,
    exercises,
    workouts,
    activity,
    hydration,
    goals,
    analytics,
    templates,
)


def _auto_migrate():
    from sqlalchemy import text, inspect
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        columns_to_ensure = [
            ("users", "height_cm", "FLOAT"),
            ("users", "weight_kg", "FLOAT"),
            ("users", "fitness_goal", "VARCHAR(50)"),
            ("users", "profile_pic_url", "VARCHAR(512)"),
            ("users", "date_of_birth", "DATE"),
            ("users", "gender", "VARCHAR(20)"),
            ("users", "bio", "VARCHAR(500)"),
            ("workout_sets", "set_type", "VARCHAR(20) DEFAULT 'NORMAL'"),
        ]
        for tbl, col, col_def in columns_to_ensure:
            if tbl not in existing_tables:
                continue
            cols = [c["name"] for c in inspector.get_columns(tbl)]
            if col not in cols:
                try:
                    with engine.begin() as conn:
                        conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}"))
                except Exception as ex:
                    print(f"[DB] Migration note: could not add {col} to {tbl}: {ex}")
    except Exception as e:
        print(f"[DB] Auto-migrate check notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist, run auto-migrations, and seed default data
    try:
        Base.metadata.create_all(bind=engine)
        _auto_migrate()
        db = SessionLocal()
        try:
            seed_exercises(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")
    yield
    # Shutdown logic if needed


import os
from fastapi.staticfiles import StaticFiles

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "profile_pics"), exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    description="Personal Gym Workout & Fitness Tracker API",
    version="1.0.0",
    lifespan=lifespan,
)

# Serve static user uploads (profile photos, etc.)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="api_uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api prefix
api_routers = [
    auth.router,
    exercises.router,
    workouts.router,
    activity.router,
    hydration.router,
    goals.router,
    analytics.router,
    templates.router,
]

for r in api_routers:
    app.include_router(r, prefix="/api")
    # Also include with direct prefix for flexibility
    app.include_router(r)


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend operational and database connectivity status."""
    db_status = "connected"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable ({type(e).__name__})"

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "database": db_status,
        "database_type": engine.dialect.name,
        "configured_target": DB_ATTEMPTED_URL_MASKED,
        "init_error": DB_INIT_ERROR,
        "version": "1.0.1"
    }
