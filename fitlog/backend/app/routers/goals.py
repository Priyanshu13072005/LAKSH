"""
LAKSH - Goals router: user fitness goals.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.user_goal import UserGoal
from app.schemas.analytics import GoalResponse, GoalUpdate
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=GoalResponse)
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the user's current fitness goals."""
    goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    if not goal:
        # Create defaults
        goal = UserGoal(user_id=current_user.id)
        db.add(goal)
        db.commit()
        db.refresh(goal)
    return goal


@router.put("", response_model=GoalResponse)
def update_goals(
    req: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the user's fitness goals."""
    goal = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    if not goal:
        goal = UserGoal(user_id=current_user.id)
        db.add(goal)

    if req.daily_step_goal is not None:
        goal.daily_step_goal = req.daily_step_goal
    if req.daily_water_goal_ml is not None:
        goal.daily_water_goal_ml = req.daily_water_goal_ml

    db.commit()
    db.refresh(goal)
    return goal
