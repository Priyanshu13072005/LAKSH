"""
LAKSH - UserGoal model.
Stores configurable daily goals per user.
"""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.db.base import Base


class UserGoal(Base):
    __tablename__ = "user_goals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    daily_step_goal = Column(Integer, default=10000, nullable=False)
    daily_water_goal_ml = Column(Integer, default=2500, nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
