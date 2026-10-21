"""
LAKSH - WorkoutSet model.
Individual set record within a workout exercise.
"""

from sqlalchemy import Column, Integer, Float, Boolean, Text, ForeignKey, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workout_exercise_id = Column(
        Integer,
        ForeignKey("workout_exercises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    set_number = Column(Integer, nullable=False)
    repetitions = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=True)  # NULL for bodyweight exercises
    rest_seconds = Column(Integer, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    set_type = Column(
        String(20), default="NORMAL", nullable=False
    )  # NORMAL, WARMUP, DROP, FAILURE
    notes = Column(Text, nullable=True)

    # Relationship
    workout_exercise = relationship("WorkoutExercise", back_populates="sets")
