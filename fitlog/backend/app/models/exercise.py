"""
LAKSH - Exercise model.
Stores both built-in exercises (owner_user_id=NULL) and user-created custom exercises.
"""

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, func
from app.db.base import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    muscle_group = Column(String(50), nullable=False)
    equipment = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)  # e.g., strength, cardio, flexibility
    uses_external_weight = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
