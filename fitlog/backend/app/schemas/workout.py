"""
LAKSH - Workout schemas (sessions, exercises, sets).
"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional


# --- Sets ---
class SetCreate(BaseModel):
    set_number: int = Field(..., ge=1)
    repetitions: int = Field(..., ge=0)
    weight_kg: float | None = Field(None, ge=0)
    rest_seconds: int | None = Field(None, ge=0)
    is_completed: bool = False
    set_type: str = Field("NORMAL", max_length=20)  # NORMAL, WARMUP, DROP, FAILURE
    notes: str | None = None


class SetUpdate(BaseModel):
    set_number: int | None = Field(None, ge=1)
    repetitions: int | None = Field(None, ge=0)
    weight_kg: float | None = Field(None, ge=0)
    rest_seconds: int | None = Field(None, ge=0)
    is_completed: bool | None = None
    set_type: str | None = None
    notes: str | None = None


class SetResponse(BaseModel):
    id: int
    workout_exercise_id: int
    set_number: int
    repetitions: int
    weight_kg: float | None
    rest_seconds: int | None
    is_completed: bool
    set_type: str = "NORMAL"
    notes: str | None

    model_config = {"from_attributes": True}


# --- Workout Exercises ---
class WorkoutExerciseCreate(BaseModel):
    exercise_id: int
    order_index: int = 0
    notes: str | None = None


class WorkoutExerciseUpdate(BaseModel):
    order_index: int | None = None
    notes: str | None = None


class WorkoutExerciseResponse(BaseModel):
    id: int
    workout_session_id: int
    exercise_id: int
    order_index: int
    notes: str | None
    exercise_name: str | None = None
    muscle_group: str | None = None
    sets: List[SetResponse] = []

    model_config = {"from_attributes": True}


# --- Workout Sessions ---
class WorkoutCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    workout_date: date
    duration_seconds: int | None = Field(None, ge=0)
    status: str | None = Field("IN_PROGRESS", max_length=20)
    notes: str | None = None


class WorkoutUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    workout_date: date | None = None
    duration_seconds: int | None = Field(None, ge=0)
    status: str | None = None
    notes: str | None = None


class WorkoutResponse(BaseModel):
    id: int
    user_id: int
    title: str | None
    workout_date: date
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    paused_seconds: int
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    exercises: List[WorkoutExerciseResponse] = []
    total_sets: int = 0
    total_reps: int = 0
    total_volume: float = 0.0

    model_config = {"from_attributes": True}


class WorkoutSummary(BaseModel):
    id: int
    title: str | None
    workout_date: date
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    status: str
    exercise_count: int = 0
    total_sets: int = 0
    total_reps: int = 0
    total_volume: float = 0.0

    model_config = {"from_attributes": True}
