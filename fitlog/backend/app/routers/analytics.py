"""
LAKSH - Analytics router: Dashboard metrics, workout analytics, and exercise progression.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sqlfunc, desc
from datetime import date, timedelta
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.models.daily_activity import DailyActivity
from app.models.water_intake import WaterIntake
from app.models.user_goal import UserGoal
from app.models.exercise import Exercise
from app.schemas.analytics import (
    DashboardSummary, 
    WorkoutAnalytics, 
    ExerciseProgression,
    PersonalRecordEntry,
)
from app.dependencies.auth import get_current_user
from app.utils.datetime_utils import today_utc, start_of_week, date_range

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard_summary(
    target_date: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate all stats needed for the dashboard."""
    today = target_date or datetime.now().date()

    # 1. User Goals
    goals = db.query(UserGoal).filter(UserGoal.user_id == current_user.id).first()
    step_goal = goals.daily_step_goal if goals else 10000
    water_goal_ml = goals.daily_water_goal_ml if goals else 2500

    # 2. Check active workout
    active_workout = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "IN_PROGRESS",
        )
        .first()
    )
    has_active_workout = active_workout is not None

    # 3. Today's workouts stats
    today_sessions = (
        db.query(WorkoutSession)
        .options(
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.sets)
        )
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.workout_date == today,
        )
        .all()
    )

    workout_duration_seconds = 0
    total_exercises = 0
    total_sets = 0
    total_reps = 0
    total_volume = 0.0

    for s in today_sessions:
        workout_duration_seconds += s.duration_seconds or 0
        total_exercises += len(s.exercises)
        for we in s.exercises:
            for st in we.sets:
                if st.is_completed:
                    total_sets += 1
                    total_reps += st.repetitions
                    if st.weight_kg:
                        total_volume += st.weight_kg * st.repetitions

    # 4. Today's Activity (Steps)
    activity = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date == today,
        )
        .first()
    )
    steps_today = activity.steps if activity else 0
    step_progress_pct = round((steps_today / step_goal * 100) if step_goal > 0 else 0.0, 1)

    # 5. Today's Hydration
    intakes = (
        db.query(WaterIntake)
        .filter(
            WaterIntake.user_id == current_user.id,
            sqlfunc.date(WaterIntake.consumed_at) == today,
        )
        .all()
    )
    water_today_ml = sum(i.amount_ml for i in intakes)
    water_progress_pct = round((water_today_ml / water_goal_ml * 100) if water_goal_ml > 0 else 0.0, 1)

    # 6. Weekly Activity Charts (Last 7 days: today-6 to today)
    start_date = today - timedelta(days=6)
    days_list = list(date_range(start_date, today))

    # Weekly steps query
    steps_records = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == current_user.id,
            DailyActivity.activity_date >= start_date,
            DailyActivity.activity_date <= today,
        )
        .all()
    )
    steps_map = {r.activity_date: r.steps for r in steps_records}
    weekly_steps = [
        {
            "date": d.isoformat(),
            "day": d.strftime("%a"),
            "steps": steps_map.get(d, 0),
        }
        for d in days_list
    ]

    # Weekly workout duration query
    week_sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.workout_date >= start_date,
            WorkoutSession.workout_date <= today,
            WorkoutSession.status == "COMPLETED",
        )
        .all()
    )
    duration_map: dict[date, int] = {}
    for ws in week_sessions:
        duration_map[ws.workout_date] = duration_map.get(ws.workout_date, 0) + (ws.duration_seconds or 0)

    weekly_workout_durations = [
        {
            "date": d.isoformat(),
            "day": d.strftime("%a"),
            "duration_minutes": round(duration_map.get(d, 0) / 60, 1),
        }
        for d in days_list
    ]

    # Workouts this week (Monday to today)
    mon = start_of_week(today)
    workouts_this_week = (
        db.query(sqlfunc.count(WorkoutSession.id))
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.workout_date >= mon,
            WorkoutSession.workout_date <= today,
            WorkoutSession.status == "COMPLETED",
        )
        .scalar()
        or 0
    )

    # 7. Recent Workouts (Last 5 completed or in-progress)
    recent_objs = (
        db.query(WorkoutSession)
        .options(
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.sets)
        )
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(desc(WorkoutSession.workout_date), desc(WorkoutSession.started_at))
        .limit(5)
        .all()
    )

    recent_workouts = []
    for r in recent_objs:
        r_sets = 0
        r_reps = 0
        r_volume = 0.0
        for we in r.exercises:
            for st in we.sets:
                if st.is_completed:
                    r_sets += 1
                    r_reps += st.repetitions
                    if st.weight_kg:
                        r_volume += st.weight_kg * st.repetitions
        recent_workouts.append({
            "id": r.id,
            "title": r.title or "Workout Session",
            "workout_date": r.workout_date.isoformat(),
            "status": r.status,
            "duration_seconds": r.duration_seconds or 0,
            "exercises_count": len(r.exercises),
            "total_sets": r_sets,
            "total_reps": r_reps,
            "total_volume": round(r_volume, 2),
        })

    return DashboardSummary(
        workout_duration_seconds=workout_duration_seconds,
        total_exercises=total_exercises,
        total_sets=total_sets,
        total_reps=total_reps,
        total_volume=round(total_volume, 2),
        has_active_workout=has_active_workout,
        steps_today=steps_today,
        step_goal=step_goal,
        step_progress_pct=min(step_progress_pct, 100.0),
        water_today_ml=water_today_ml,
        water_goal_ml=water_goal_ml,
        water_progress_pct=min(water_progress_pct, 100.0),
        workouts_this_week=workouts_this_week,
        weekly_workout_durations=weekly_workout_durations,
        weekly_steps=weekly_steps,
        recent_workouts=recent_workouts,
    )


@router.get("/workouts", response_model=WorkoutAnalytics)
def get_workout_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate overall workout statistics, weekly breakdown, and volume history."""
    all_sessions = (
        db.query(WorkoutSession)
        .options(
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.sets)
        )
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "COMPLETED",
        )
        .order_by(WorkoutSession.workout_date.asc())
        .all()
    )

    total_workouts = len(all_sessions)
    total_duration_seconds = sum(s.duration_seconds or 0 for s in all_sessions)
    avg_duration_seconds = (
        round(total_duration_seconds / total_workouts, 1) if total_workouts > 0 else 0.0
    )

    total_sets = 0
    total_reps = 0
    total_volume = 0.0
    volume_by_session = []

    for s in all_sessions:
        s_vol = 0.0
        for we in s.exercises:
            for st in we.sets:
                if st.is_completed:
                    total_sets += 1
                    total_reps += st.repetitions
                    if st.weight_kg:
                        s_vol += st.weight_kg * st.repetitions
        total_volume += s_vol
        volume_by_session.append({
            "id": s.id,
            "title": s.title or "Workout",
            "date": s.workout_date.isoformat(),
            "volume": round(s_vol, 2),
            "duration_minutes": round((s.duration_seconds or 0) / 60, 1),
        })

    # Group completed workouts into last 8 weeks
    weeks_map: dict[str, int] = {}
    today = today_utc()
    start_8_weeks = today - timedelta(weeks=8)
    for s in all_sessions:
        if s.workout_date >= start_8_weeks:
            # format as Week YYYY-WW or Date of start of week
            w_start = start_of_week(s.workout_date).strftime("%b %d")
            weeks_map[w_start] = weeks_map.get(w_start, 0) + 1

    workouts_by_week = [
        {"week": week, "workouts": count}
        for week, count in weeks_map.items()
    ]

    return WorkoutAnalytics(
        total_workouts=total_workouts,
        total_duration_seconds=total_duration_seconds,
        avg_duration_seconds=avg_duration_seconds,
        total_sets=total_sets,
        total_reps=total_reps,
        total_volume=round(total_volume, 2),
        workouts_by_week=workouts_by_week,
        volume_by_session=volume_by_session[-15:],  # Last 15 sessions for chart
    )


@router.get("/records/personal-records", response_model=List[PersonalRecordEntry])
def get_personal_records(
    muscle_group: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all exercise PRs (max weight and max reps) for the current user,
    extracted directly from their completed workout sessions.
    """
    # Fetch all completed workout exercises with their sets, session, and exercise details
    workout_exercises = (
        db.query(WorkoutExercise)
        .join(WorkoutSession, WorkoutExercise.workout_session_id == WorkoutSession.id)
        .join(Exercise, WorkoutExercise.exercise_id == Exercise.id)
        .options(
            joinedload(WorkoutExercise.sets),
            joinedload(WorkoutExercise.session),
            joinedload(WorkoutExercise.exercise),
        )
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "COMPLETED",
        )
        .order_by(WorkoutSession.workout_date.asc())
        .all()
    )

    # Group by exercise and find the maximum weights and maximum reps
    pr_map: dict[int, dict] = {}

    for we in workout_exercises:
        ex = we.exercise
        if not ex:
            continue
        if muscle_group and muscle_group.lower() != "all" and ex.muscle_group.lower() != muscle_group.lower():
            continue

        session_date = we.session.workout_date.isoformat() if we.session and we.session.workout_date else None

        if ex.id not in pr_map:
            pr_map[ex.id] = {
                "exercise_id": ex.id,
                "exercise_name": ex.name,
                "muscle_group": ex.muscle_group,
                "equipment": ex.equipment,
                "category": ex.category,
                "uses_external_weight": ex.uses_external_weight,
                "max_weight_kg": 0.0,
                "max_weight_reps": 0,
                "max_weight_date": None,
                "max_reps": 0,
                "max_reps_weight_kg": 0.0,
                "max_reps_date": None,
                "total_sessions": set(),
                "best_estimated_1rm": 0.0,
            }

        data = pr_map[ex.id]
        if we.session:
            data["total_sessions"].add(we.session.id)

        for st in we.sets:
            if not st.is_completed:
                continue

            w = float(st.weight_kg or 0.0)
            r = int(st.repetitions or 0)

            # Max weight record: primary is weight, tie-break by reps
            if w > data["max_weight_kg"] or (w == data["max_weight_kg"] and r > data["max_weight_reps"]):
                data["max_weight_kg"] = w
                data["max_weight_reps"] = r
                data["max_weight_date"] = session_date

            # Max reps record: primary is reps, tie-break by weight
            if r > data["max_reps"] or (r == data["max_reps"] and w > data["max_reps_weight_kg"]):
                data["max_reps"] = r
                data["max_reps_weight_kg"] = w
                data["max_reps_date"] = session_date

            # Brzycki 1RM formula calculation: weight * (36 / (37 - min(reps, 36)))
            if w > 0 and r > 0:
                est_1rm = w * (36.0 / (37.0 - min(r, 36)))
                if est_1rm > data["best_estimated_1rm"]:
                    data["best_estimated_1rm"] = round(est_1rm, 1)

    results = []
    for d in pr_map.values():
        # Only include exercises that have at least one completed set (max_reps > 0 or max_weight_kg > 0)
        if d["max_reps"] > 0 or d["max_weight_kg"] > 0:
            results.append(
                PersonalRecordEntry(
                    exercise_id=d["exercise_id"],
                    exercise_name=d["exercise_name"],
                    muscle_group=d["muscle_group"],
                    equipment=d["equipment"],
                    category=d["category"],
                    uses_external_weight=d["uses_external_weight"],
                    max_weight_kg=round(d["max_weight_kg"], 2),
                    max_weight_reps=d["max_weight_reps"],
                    max_weight_date=d["max_weight_date"],
                    max_reps=d["max_reps"],
                    max_reps_weight_kg=round(d["max_reps_weight_kg"], 2),
                    max_reps_date=d["max_reps_date"],
                    total_sessions=len(d["total_sessions"]),
                    best_estimated_1rm=d["best_estimated_1rm"],
                )
            )

    # Sort results by exercise name
    results.sort(key=lambda x: x.exercise_name)
    return results


@router.get("/exercises/{exercise_id}/progression", response_model=ExerciseProgression)
def get_exercise_progression(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve historical progression and personal records for a specific exercise."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")

    workout_exercises = (
        db.query(WorkoutExercise)
        .join(WorkoutSession, WorkoutExercise.workout_session_id == WorkoutSession.id)
        .options(
            joinedload(WorkoutExercise.sets),
            joinedload(WorkoutExercise.session),
        )
        .filter(
            WorkoutExercise.exercise_id == exercise_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "COMPLETED",
        )
        .order_by(WorkoutSession.workout_date.asc())
        .all()
    )

    history = []
    pr_weight: float | None = None
    pr_weight_reps: int | None = None
    pr_weight_date: str | None = None
    pr_reps: int | None = None
    pr_reps_weight: float | None = None
    pr_reps_date: str | None = None
    best_est_1rm: float | None = None

    for we in workout_exercises:
        max_w = 0.0
        tot_vol = 0.0
        tot_r = 0
        sess_date = we.session.workout_date.isoformat() if we.session and we.session.workout_date else None
        for st in we.sets:
            if st.is_completed:
                tot_r += st.repetitions
                w = st.weight_kg or 0.0
                r = st.repetitions
                if w > max_w:
                    max_w = w
                tot_vol += w * r

                # Track PR weight and reps
                if pr_weight is None or w > pr_weight or (w == pr_weight and (pr_weight_reps is None or r > pr_weight_reps)):
                    pr_weight = w
                    pr_weight_reps = r
                    pr_weight_date = sess_date

                if pr_reps is None or r > pr_reps or (r == pr_reps and (pr_reps_weight is None or w > pr_reps_weight)):
                    pr_reps = r
                    pr_reps_weight = w
                    pr_reps_date = sess_date

                if w > 0 and r > 0:
                    est_1rm = w * (36.0 / (37.0 - min(r, 36)))
                    if best_est_1rm is None or est_1rm > best_est_1rm:
                        best_est_1rm = round(est_1rm, 1)

        if we.sets:
            history.append({
                "date": sess_date,
                "max_weight": max_w,
                "total_volume": round(tot_vol, 2),
                "total_reps": tot_r,
            })

    return ExerciseProgression(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        history=history,
        personal_record_weight=pr_weight,
        personal_record_reps=pr_reps,
        max_weight_reps=pr_weight_reps,
        max_reps_weight=pr_reps_weight,
        max_weight_date=pr_weight_date,
        max_reps_date=pr_reps_date,
        best_estimated_1rm=best_est_1rm,
    )
