"""
LAKSH - WorkoutExercise model.
Junction table linking exercises to a workout session, with order.
"""

from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workout_session_id = Column(
        Integer,
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id = Column(
        Integer,
        ForeignKey("exercises.id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_index = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)

    # Relationships
    session = relationship("WorkoutSession", back_populates="exercises")
    exercise = relationship("Exercise")
    sets = relationship(
        "WorkoutSet", back_populates="workout_exercise", cascade="all, delete-orphan"
    )
