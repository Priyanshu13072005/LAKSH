"""
LAKSH - Workout Template models.
Stores reusable workout routines (e.g., Push Day, Pull Day, Legs).
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="dumbbell")  # Lucide icon name
    color = Column(String(20), default="emerald")  # Tailwind color name
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    exercises = relationship(
        "WorkoutTemplateExercise",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="WorkoutTemplateExercise.order_index",
    )


class WorkoutTemplateExercise(Base):
    __tablename__ = "workout_template_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(
        Integer,
        ForeignKey("workout_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id = Column(
        Integer, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False
    )
    order_index = Column(Integer, nullable=False, default=0)
    default_sets = Column(Integer, default=3)
    default_reps = Column(Integer, default=10)
    default_weight_kg = Column(Float, nullable=True)
    rest_seconds = Column(Integer, default=90)
    notes = Column(Text, nullable=True)

    # Relationships
    template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise")
