"""
LAKSH - Hydration schemas (water intake).
"""

from pydantic import BaseModel, Field
from datetime import datetime


class WaterIntakeCreate(BaseModel):
    amount_ml: int = Field(..., gt=0, le=5000)
    consumed_at: datetime | None = None  # Defaults to server time if omitted
    note: str | None = Field(None, max_length=255)


class WaterIntakeUpdate(BaseModel):
    amount_ml: int | None = Field(None, gt=0, le=5000)
    consumed_at: datetime | None = None
    note: str | None = Field(None, max_length=255)


class WaterIntakeResponse(BaseModel):
    id: int
    user_id: int
    amount_ml: int
    consumed_at: datetime
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyHydrationSummary(BaseModel):
    date: str
    total_ml: int
    goal_ml: int
    progress_pct: float
    entries: list[WaterIntakeResponse] = []
