"""
LAKSH - Seed demo account with initial data for instant out-of-the-box experience.
"""

from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user_goal import UserGoal
from app.models.exercise import Exercise
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.models.daily_activity import DailyActivity
from app.models.water_intake import WaterIntake
from app.core.security import hash_password
from app.utils.datetime_utils import today_utc


def seed_demo_user(db: Session):
    demo_email = "athlete@laksh.app"
    user = db.query(User).filter(User.email.in_([demo_email, "athlete@fitlog.app"])).first()
    if user and user.email == "athlete@fitlog.app":
        user.email = demo_email
        db.commit()
        db.refresh(user)
    if not user:
        user = User(
            name="Alex Hunter",
            email=demo_email,
            password_hash=hash_password("fitness123"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Goals
        goal = UserGoal(
            user_id=user.id,
            daily_step_goal=10000,
            daily_water_goal_ml=3000,
        )
        db.add(goal)

        # Seed steps for last 7 days
        today = today_utc()
        sample_steps = [8420, 10250, 9300, 11400, 7890, 12100, 8940]
        for i, steps in enumerate(sample_steps):
            d = today - timedelta(days=6 - i)
            act = DailyActivity(
                user_id=user.id,
                activity_date=d,
                steps=steps,
            )
            db.add(act)

        # Seed water for today
        now = datetime.now(timezone.utc)
        for ml, mins_ago in [(500, 240), (250, 180), (500, 60), (250, 20)]:
            w = WaterIntake(
                user_id=user.id,
                amount_ml=ml,
                consumed_at=now - timedelta(minutes=mins_ago),
            )
            db.add(w)

        # Sample completed workout session
        exercises = db.query(Exercise).limit(3).all()
        if exercises:
            session = WorkoutSession(
                user_id=user.id,
                title="Chest & Triceps Hypertrophy",
                workout_date=today,
                started_at=now - timedelta(hours=2),
                ended_at=now - timedelta(hours=1, minutes=15),
                duration_seconds=2700,
                status="COMPLETED",
                notes="Felt energetic today, hit a new PR on bench press!",
            )
            db.add(session)
            db.flush()

            for idx, ex in enumerate(exercises):
                we = WorkoutExercise(
                    workout_session_id=session.id,
                    exercise_id=ex.id,
                    order_index=idx + 1,
                )
                db.add(we)
                db.flush()

                weights = [60.0, 70.0, 80.0] if ex.uses_external_weight else [0.0, 0.0, 0.0]
                reps = [12, 10, 8]
                for s_num in range(3):
                    st = WorkoutSet(
                        workout_exercise_id=we.id,
                        set_number=s_num + 1,
                        weight_kg=weights[s_num],
                        repetitions=reps[s_num],
                        is_completed=True,
                    )
                    db.add(st)

        db.commit()
        return True
    return False


if __name__ == "__main__":
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        created = seed_demo_user(db)
        print("Demo user created:", created)
    finally:
        db.close()
