"""
LAKSH - User model.
"""

from sqlalchemy import Column, Integer, String, Float, Date, DateTime, func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    timezone = Column(String(50), default="UTC")
    preferred_weight_unit = Column(String(10), default="kg")
    google_fit_refresh_token = Column(String(512), nullable=True)

    # Profile fields
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    fitness_goal = Column(String(50), nullable=True)  # e.g. "Muscle Gain", "Fat Loss", "Endurance", "Maintain"
    profile_pic_url = Column(String(512), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)  # e.g. "Male", "Female", "Other", "Prefer not to say"
    bio = Column(String(500), nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
