"""
LAKSH - Analytics schemas for dashboard and progress data.
"""

from pydantic import BaseModel
from datetime import date


class DashboardSummary(BaseModel):
    # Today's workout stats
    workout_duration_seconds: int = 0
    total_exercises: int = 0
    total_sets: int = 0
    total_reps: int = 0
    total_volume: float = 0.0
    has_active_workout: bool = False

    # Today's activity
    steps_today: int = 0
    step_goal: int = 10000
    step_progress_pct: float = 0.0

    # Today's hydration
    water_today_ml: int = 0
    water_goal_ml: int = 2500
    water_progress_pct: float = 0.0

    # Weekly summary
    workouts_this_week: int = 0
    weekly_workout_durations: list = []  # [{day, duration_minutes}]
    weekly_steps: list = []  # [{day, steps}]

    # Recent history
    recent_workouts: list = []


class WorkoutAnalytics(BaseModel):
    total_workouts: int = 0
    total_duration_seconds: int = 0
    avg_duration_seconds: float = 0.0
    total_sets: int = 0
    total_reps: int = 0
    total_volume: float = 0.0
    workouts_by_week: list = []
    volume_by_session: list = []


class PersonalRecordEntry(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group: str
    equipment: str
    category: str
    uses_external_weight: bool
    max_weight_kg: float
    max_weight_reps: int
    max_weight_date: str | None = None
    max_reps: int
    max_reps_weight_kg: float
    max_reps_date: str | None = None
    total_sessions: int = 0
    best_estimated_1rm: float = 0.0


class ExerciseProgression(BaseModel):
    exercise_id: int
    exercise_name: str
    history: list = []  # [{date, max_weight, total_volume, total_reps}]
    personal_record_weight: float | None = None
    personal_record_reps: int | None = None
    max_weight_reps: int | None = None
    max_reps_weight: float | None = None
    max_weight_date: str | None = None
    max_reps_date: str | None = None
    best_estimated_1rm: float | None = None


class GoalResponse(BaseModel):
    daily_step_goal: int
    daily_water_goal_ml: int

    model_config = {"from_attributes": True}


class GoalUpdate(BaseModel):
    daily_step_goal: int | None = None
    daily_water_goal_ml: int | None = None
