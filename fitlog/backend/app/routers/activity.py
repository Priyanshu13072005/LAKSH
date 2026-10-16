"""
LAKSH - Activity router: daily step tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.db.session import get_db
from app.models.user import User
from app.models.daily_activity import DailyActivity
from app.schemas.activity import DailyActivityUpsert, DailyActivityResponse
from app.dependencies.auth import get_current_user
from app.utils.datetime_utils import today_utc

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/daily", response_model=DailyActivityResponse | None)
def get_daily_activity(
    activity_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get step count for a specific date (defaults to today)."""
    target_date = activity_date or today_utc()
    record = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date == target_date,
        )
        .first()
    )
    return record


@router.put("/daily/{activity_date}", response_model=DailyActivityResponse)
def upsert_daily_activity(
    activity_date: date,
    req: DailyActivityUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update the step count for a specific date (upsert)."""
    record = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date == activity_date,
        )
        .first()
    )
    if record:
        record.steps = req.steps
    else:
        record = DailyActivity(
            user_id=current_user.id,
            activity_date=activity_date,
            steps=req.steps,
        )
        db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/history", response_model=list[DailyActivityResponse])
def get_activity_history(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get step history with optional date range."""
    query = db.query(DailyActivity).filter(DailyActivity.user_id == current_user.id)
    if from_date:
        query = query.filter(DailyActivity.activity_date >= from_date)
    if to_date:
        query = query.filter(DailyActivity.activity_date <= to_date)
    return (
        query.order_by(DailyActivity.activity_date.desc()).limit(limit).all()
    )


# ─── Google Fit / Health Connect Auto-Sync Endpoints ───────────────────
from app.services.google_fit import (
    get_google_auth_url,
    exchange_code_for_tokens,
    sync_user_steps,
)
from app.core.config import settings
from pydantic import BaseModel


class GoogleConnectStatus(BaseModel):
    is_connected: bool
    client_configured: bool
    auth_url: str | None = None


class GoogleCallbackRequest(BaseModel):
    code: str


@router.get("/google-fit/status", response_model=GoogleConnectStatus)
def get_google_fit_status(
    current_user: User = Depends(get_current_user),
):
    """Check if the user has connected Google Fit and whether client keys are configured."""
    client_configured = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)
    is_connected = bool(current_user.google_fit_refresh_token)
    auth_url = get_google_auth_url() if client_configured else None
    return GoogleConnectStatus(
        is_connected=is_connected,
        client_configured=client_configured,
        auth_url=auth_url,
    )


@router.post("/google-fit/callback")
async def google_fit_callback(
    req: GoogleCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange auth code for tokens and save refresh token to user."""
    try:
        tokens = await exchange_code_for_tokens(req.code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange Google OAuth code: {str(e)}")

    refresh_token = tokens.get("refresh_token")
    if refresh_token:
        current_user.google_fit_refresh_token = refresh_token
        db.commit()
    elif not current_user.google_fit_refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token returned. Please revoke access in Google account settings and re-authorize.",
        )

    # Perform initial sync for today
    today = today_utc()
    try:
        steps = await sync_user_steps(db, current_user, today)
        return {"status": "connected", "synced_steps": steps}
    except Exception as e:
        return {"status": "connected", "synced_steps": 0, "sync_warning": str(e)}


@router.post("/google-fit/sync")
async def trigger_google_fit_sync(
    activity_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger an on-demand sync of steps from Google Fit / Health Connect."""
    target_date = activity_date or today_utc()
    if not current_user.google_fit_refresh_token:
        raise HTTPException(status_code=400, detail="Google Fit is not connected.")

    try:
        steps = await sync_user_steps(db, current_user, target_date)
        return {"status": "synced", "activity_date": target_date.isoformat(), "steps": steps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/google-fit/disconnect")
def disconnect_google_fit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect Google Fit from user profile."""
    current_user.google_fit_refresh_token = None
    db.commit()
    return {"status": "disconnected"}

