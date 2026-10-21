# LAKSH Backend - Models package
# Import all models here so Alembic and the app can discover them.

from app.models.user import User
from app.models.exercise import Exercise
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.models.daily_activity import DailyActivity
from app.models.water_intake import WaterIntake
from app.models.user_goal import UserGoal
from app.models.workout_template import WorkoutTemplate, WorkoutTemplateExercise

__all__ = [
    "User",
    "Exercise",
    "WorkoutSession",
    "WorkoutExercise",
    "WorkoutSet",
    "DailyActivity",
    "WaterIntake",
    "UserGoal",
    "WorkoutTemplate",
    "WorkoutTemplateExercise",
]
