"""
LAKSH - WaterIntake model.
Each record is a single water intake event with a timestamp.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.db.base import Base


class WaterIntake(Base):
    __tablename__ = "water_intakes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount_ml = Column(Integer, nullable=False)  # Stored as integer millilitres
    consumed_at = Column(DateTime, nullable=False)
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
