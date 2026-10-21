"""
LAKSH - Hydration router: water intake logging.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from datetime import date, datetime, timezone
from app.db.session import get_db
from app.models.user import User
from app.models.water_intake import WaterIntake
from app.models.user_goal import UserGoal
from app.schemas.hydration import (
    WaterIntakeCreate,
    WaterIntakeUpdate,
    WaterIntakeResponse,
    DailyHydrationSummary,
)
from app.dependencies.auth import get_current_user
from app.utils.datetime_utils import today_utc

router = APIRouter(prefix="/hydration", tags=["Hydration"])


@router.get("/daily", response_model=DailyHydrationSummary)
def get_daily_hydration(
    target_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's (or specified date's) water intake summary."""
    d = target_date or datetime.now().date()
    entries = (
        db.query(WaterIntake)
        .filter(
            WaterIntake.user_id == current_user.id,
            sqlfunc.date(WaterIntake.consumed_at) == d,
        )
        .order_by(WaterIntake.consumed_at.desc())
        .all()
    )
    total = sum(e.amount_ml for e in entries)
    goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    goal_ml = goal.daily_water_goal_ml if goal else 2500
    progress = round((total / goal_ml * 100) if goal_ml > 0 else 0, 1)
    return DailyHydrationSummary(
        date=str(d),
        total_ml=total,
        goal_ml=goal_ml,
        progress_pct=min(progress, 100.0),
        entries=entries,
    )


@router.post("/intakes", response_model=WaterIntakeResponse, status_code=status.HTTP_201_CREATED)
def add_water_intake(
    req: WaterIntakeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a water intake entry with accurate date and time."""
    consumed_at = req.consumed_at
    if consumed_at is None:
        consumed_at = datetime.now()
    elif getattr(consumed_at, "tzinfo", None) is not None:
        # Convert timezone-aware datetime to naive local datetime for consistent SQLite date handling
        consumed_at = consumed_at.astimezone().replace(tzinfo=None)

    intake = WaterIntake(
        user_id=current_user.id,
        amount_ml=req.amount_ml,
        consumed_at=consumed_at,
        note=req.note,
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


@router.patch("/intakes/{intake_id}", response_model=WaterIntakeResponse)
def update_water_intake(
    intake_id: int,
    req: WaterIntakeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a water intake entry."""
    intake = (
        db.query(WaterIntake)
        .filter(WaterIntake.id == intake_id, WaterIntake.user_id == current_user.id)
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Water intake entry not found.")
    for field, value in req.model_dump(exclude_unset=True).items():
        if field == "consumed_at" and value is not None and getattr(value, "tzinfo", None) is not None:
            value = value.astimezone().replace(tzinfo=None)
        setattr(intake, field, value)
    db.commit()
    db.refresh(intake)
    return intake


@router.delete("/intakes/{intake_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water_intake(
    intake_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a water intake entry (undo)."""
    intake = (
        db.query(WaterIntake)
        .filter(WaterIntake.id == intake_id, WaterIntake.user_id == current_user.id)
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Water intake entry not found.")
    db.delete(intake)
    db.commit()


@router.get("/history", response_model=list[WaterIntakeResponse])
def get_hydration_history(
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get water intake history with optional date range."""
    query = db.query(WaterIntake).filter(WaterIntake.user_id == current_user.id)
    if from_date:
        query = query.filter(sqlfunc.date(WaterIntake.consumed_at) >= from_date)
    if to_date:
        query = query.filter(sqlfunc.date(WaterIntake.consumed_at) <= to_date)
    return query.order_by(WaterIntake.consumed_at.desc()).limit(limit).all()
