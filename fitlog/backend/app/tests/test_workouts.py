"""
Tests for workout session models, stats computation, and set logic.
"""

from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.routers.workouts import _compute_workout_stats
from datetime import datetime, date, timezone


def test_workout_stats_computation():
    ws = WorkoutSession(
        id=1,
        user_id=1,
        title="Test Leg Day",
        workout_date=date.today(),
        started_at=datetime.now(timezone.utc),
    )
    we = WorkoutExercise(id=1, workout_session_id=1, exercise_id=1)
    
    # Completed set: 100kg x 5 reps = 500 volume
    s1 = WorkoutSet(id=1, workout_exercise_id=1, set_number=1, weight_kg=100.0, repetitions=5, is_completed=True)
    # Uncompleted set: should not count in volume
    s2 = WorkoutSet(id=2, workout_exercise_id=1, set_number=2, weight_kg=100.0, repetitions=5, is_completed=False)
    # Completed bodyweight set: 0 weight, 10 reps
    s3 = WorkoutSet(id=3, workout_exercise_id=1, set_number=3, weight_kg=0.0, repetitions=10, is_completed=True)

    we.sets = [s1, s2, s3]
    ws.exercises = [we]

    stats = _compute_workout_stats(ws)
    assert stats["total_sets"] == 2
    assert stats["total_reps"] == 15
    assert stats["total_volume"] == 500.0
