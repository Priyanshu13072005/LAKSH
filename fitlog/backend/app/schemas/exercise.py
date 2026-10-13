"""
LAKSH - Exercise schemas.
"""

from pydantic import BaseModel, Field
from datetime import datetime


class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    muscle_group: str = Field(..., min_length=1, max_length=50)
    equipment: str = Field(..., min_length=1, max_length=50)
    category: str = Field(..., min_length=1, max_length=50)
    uses_external_weight: bool = True
    description: str | None = None
    instructions: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    muscle_group: str | None = Field(None, min_length=1, max_length=50)
    equipment: str | None = Field(None, min_length=1, max_length=50)
    category: str | None = Field(None, min_length=1, max_length=50)
    uses_external_weight: bool | None = None
    description: str | None = None
    instructions: str | None = None


class ExerciseResponse(BaseModel):
    id: int
    name: str
    muscle_group: str
    equipment: str
    category: str
    uses_external_weight: bool
    description: str | None
    instructions: str | None
    owner_user_id: int | None
    created_at: datetime

    # Cumulative user stats for this exercise
    total_sets: int = 0
    total_reps: int = 0
    total_volume: float = 0.0
    personal_record_weight: float | None = None
    personal_record_reps: int | None = None

    model_config = {"from_attributes": True}

