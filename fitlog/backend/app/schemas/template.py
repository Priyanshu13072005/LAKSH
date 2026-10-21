"""
LAKSH - Workout Template schemas.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


# --- Template Exercises ---
class TemplateExerciseCreate(BaseModel):
    exercise_id: int
    order_index: int = 0
    default_sets: int = Field(3, ge=1)
    default_reps: int = Field(10, ge=1)
    default_weight_kg: float | None = Field(None, ge=0)
    rest_seconds: int = Field(90, ge=0)
    notes: str | None = None


class TemplateExerciseUpdate(BaseModel):
    order_index: int | None = None
    default_sets: int | None = Field(None, ge=1)
    default_reps: int | None = Field(None, ge=1)
    default_weight_kg: float | None = Field(None, ge=0)
    rest_seconds: int | None = Field(None, ge=0)
    notes: str | None = None


class TemplateExerciseResponse(BaseModel):
    id: int
    template_id: int
    exercise_id: int
    order_index: int
    default_sets: int
    default_reps: int
    default_weight_kg: float | None
    rest_seconds: int | None
    notes: str | None
    exercise_name: str | None = None
    muscle_group: str | None = None
    equipment: str | None = None

    model_config = {"from_attributes": True}


# --- Templates ---
class TemplateCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    icon: str = "dumbbell"
    color: str = "emerald"
    exercises: List[TemplateExerciseCreate] = []


class TemplateUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    icon: str | None = None
    color: str | None = None


class TemplateResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: str | None
    icon: str
    color: str
    created_at: datetime
    updated_at: datetime
    exercises: List[TemplateExerciseResponse] = []
    exercise_count: int = 0

    model_config = {"from_attributes": True}


class TemplateSummary(BaseModel):
    id: int
    name: str
    description: str | None
    icon: str
    color: str
    exercise_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
