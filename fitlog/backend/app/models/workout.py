"""
LAKSH - Workout session model.
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String(200), nullable=True)
    workout_date = Column(Date, nullable=False)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)  # Computed on finish
    paused_seconds = Column(Integer, default=0)  # Total paused time
    status = Column(
        String(20), nullable=False, default="IN_PROGRESS"
    )  # IN_PROGRESS, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    exercises = relationship(
        "WorkoutExercise", back_populates="session", cascade="all, delete-orphan"
    )
