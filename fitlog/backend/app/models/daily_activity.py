"""
LAKSH - DailyActivity model.
One record per user per date for step tracking.
"""

from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, UniqueConstraint, func
from app.db.base import Base


class DailyActivity(Base):
    __tablename__ = "daily_activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_date = Column(Date, nullable=False)
    steps = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Prevent duplicate daily records per user
    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_user_activity_date"),
    )
