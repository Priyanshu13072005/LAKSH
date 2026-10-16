"""
LAKSH - Activity schemas (daily steps).
"""

from pydantic import BaseModel, Field
from datetime import date, datetime


class DailyActivityUpsert(BaseModel):
    steps: int = Field(..., ge=0, le=500000)


class DailyActivityResponse(BaseModel):
    id: int
    user_id: int
    activity_date: date
    steps: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
