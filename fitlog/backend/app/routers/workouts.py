"""
LAKSH - Workout router: sessions, exercises within sessions, sets.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone, date
from app.db.session import get_db
from app.models.user import User
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.models.exercise import Exercise
from app.schemas.workout import (
    WorkoutCreate,
    WorkoutUpdate,
    WorkoutResponse,
    WorkoutSummary,
    WorkoutExerciseCreate,
    WorkoutExerciseUpdate,
    WorkoutExerciseResponse,
    SetCreate,
    SetUpdate,
    SetResponse,
)
from app.dependencies.auth import get_current_user

router = APIRouter(tags=["Workouts"])


# ─── Helper ──────────────────────────────────────────────────────
def _compute_workout_stats(session_obj: WorkoutSession) -> dict:
    """Compute total sets, reps, and volume for a workout session."""
    total_sets = 0
    total_reps = 0
    total_volume = 0.0
    for we in session_obj.exercises:
        for s in we.sets:
            if s.is_completed:
                total_sets += 1
                total_reps += s.repetitions
                if s.weight_kg:
                    total_volume += s.weight_kg * s.repetitions
    return {
        "total_sets": total_sets,
        "total_reps": total_reps,
        "total_volume": round(total_volume, 2),
    }


def _enrich_exercise_response(we: WorkoutExercise) -> dict:
    """Add exercise_name and muscle_group to the workout exercise dict."""
    data = {
        "id": we.id,
        "workout_session_id": we.workout_session_id,
        "exercise_id": we.exercise_id,
        "order_index": we.order_index,
        "notes": we.notes,
        "exercise_name": we.exercise.name if we.exercise else None,
        "muscle_group": we.exercise.muscle_group if we.exercise else None,
        "sets": we.sets,
    }
    return data


def _build_workout_response(ws: WorkoutSession) -> dict:
    stats = _compute_workout_stats(ws)
    exercises = [_enrich_exercise_response(we) for we in ws.exercises]
    return {
        **{c.name: getattr(ws, c.name) for c in ws.__table__.columns},
        "exercises": exercises,
        **stats,
    }


# ─── Workout Sessions ───────────────────────────────────────────
@router.post("/workouts", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    req: WorkoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new workout session."""
    target_status = req.status or "IN_PROGRESS"

    # If starting an IN_PROGRESS session, check for existing active session
    if target_status == "IN_PROGRESS":
        active = (
            db.query(WorkoutSession)
            .filter(
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.status == "IN_PROGRESS",
            )
            .first()
        )
        if active:
            # Return existing active session instead of crashing
            return _build_workout_response(active)

    now = datetime.now(timezone.utc)
    ws = WorkoutSession(
        user_id=current_user.id,
        title=req.title or "Workout Session",
        workout_date=req.workout_date,
        started_at=now,
        ended_at=now if target_status == "COMPLETED" else None,
        duration_seconds=req.duration_seconds if req.duration_seconds is not None else (0 if target_status == "COMPLETED" else None),
        notes=req.notes,
        status=target_status,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    # Eagerly load exercises for response
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == ws.id)
        .first()
    )
    return _build_workout_response(ws)


@router.get("/workouts", response_model=list[WorkoutSummary])
def list_workouts(
    status_filter: str | None = Query(None, alias="status"),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List workout sessions with optional filters and pagination."""
    query = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .filter(WorkoutSession.user_id == current_user.id)
    )

    if status_filter:
        query = query.filter(WorkoutSession.status == status_filter)
    if from_date:
        query = query.filter(WorkoutSession.workout_date >= from_date)
    if to_date:
        query = query.filter(WorkoutSession.workout_date <= to_date)
    if search:
        query = query.filter(WorkoutSession.title.ilike(f"%{search}%"))

    sessions = (
        query.order_by(WorkoutSession.started_at.desc()).offset(offset).limit(limit).all()
    )

    results = []
    for ws in sessions:
        stats = _compute_workout_stats(ws)
        results.append(
            WorkoutSummary(
                id=ws.id,
                title=ws.title,
                workout_date=ws.workout_date,
                started_at=ws.started_at,
                ended_at=ws.ended_at,
                duration_seconds=ws.duration_seconds,
                status=ws.status,
                exercise_count=len(ws.exercises),
                **stats,
            )
        )
    return results


@router.get("/workouts/active", response_model=WorkoutResponse | None)
def get_active_workout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the currently active in-progress workout session, or None."""
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "IN_PROGRESS",
        )
        .first()
    )
    if not ws:
        return None
    return _build_workout_response(ws)


@router.get("/workouts/{workout_id}", response_model=WorkoutResponse)
def get_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full workout details including exercises and sets."""
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")
    return _build_workout_response(ws)


@router.patch("/workouts/{workout_id}", response_model=WorkoutResponse)
@router.put("/workouts/{workout_id}", response_model=WorkoutResponse)
def update_workout(
    workout_id: int,
    req: WorkoutUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update workout title or notes."""
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    db.commit()
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    return _build_workout_response(ws)


@router.post("/workouts/{workout_id}/finish", response_model=WorkoutResponse)
def finish_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Finish an active workout and compute duration."""
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")
    if ws.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Workout is not in progress.")

    now = datetime.now(timezone.utc)
    ws.ended_at = now
    
    # Safely compute elapsed seconds handling offset-naive MySQL datetime
    started_at = ws.started_at
    if started_at:
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed = int((now - started_at).total_seconds())
    else:
        elapsed = 0
        
    ws.duration_seconds = max(0, elapsed - (ws.paused_seconds or 0))
    ws.status = "COMPLETED"
    db.commit()
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    return _build_workout_response(ws)


@router.post("/workouts/{workout_id}/cancel", response_model=WorkoutResponse)
def cancel_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an active workout."""
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")
    if ws.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="Workout is not in progress.")

    ws.ended_at = datetime.now(timezone.utc)
    ws.status = "CANCELLED"
    db.commit()
    ws = (
        db.query(WorkoutSession)
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.sets))
        .options(joinedload(WorkoutSession.exercises).joinedload(WorkoutExercise.exercise))
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    return _build_workout_response(ws)


@router.delete("/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a workout and all its exercises/sets (cascaded)."""
    ws = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.id == workout_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")
    db.delete(ws)
    db.commit()


# ─── Workout Exercises ───────────────────────────────────────────
@router.post(
    "/workouts/{workout_id}/exercises",
    response_model=WorkoutExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_exercise_to_workout(
    workout_id: int,
    req: WorkoutExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an exercise to a workout session."""
    ws = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == workout_id,
            WorkoutSession.user_id == current_user.id,
        )
        .first()
    )
    if not ws:
        raise HTTPException(status_code=404, detail="Workout not found.")

    exercise = db.query(Exercise).filter(Exercise.id == req.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")

    we = WorkoutExercise(
        workout_session_id=workout_id,
        exercise_id=req.exercise_id,
        order_index=req.order_index,
        notes=req.notes,
    )
    db.add(we)
    db.commit()
    db.refresh(we)

    return _enrich_exercise_response(we)


@router.patch("/workout-exercises/{we_id}", response_model=WorkoutExerciseResponse)
def update_workout_exercise(
    we_id: int,
    req: WorkoutExerciseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update order or notes of a workout exercise."""
    we = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutExercise.id == we_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not we:
        raise HTTPException(status_code=404, detail="Workout exercise not found.")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(we, field, value)
    db.commit()
    db.refresh(we)
    return _enrich_exercise_response(we)


@router.delete("/workout-exercises/{we_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/workouts/{workout_id}/exercises/{we_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_exercise(
    we_id: int,
    workout_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an exercise (and its sets) from a workout."""
    we = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutExercise.id == we_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not we:
        raise HTTPException(status_code=404, detail="Workout exercise not found.")
    db.delete(we)
    db.commit()


# ─── Sets ─────────────────────────────────────────────────────────
@router.post(
    "/workout-exercises/{we_id}/sets",
    response_model=SetResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_set(
    we_id: int,
    req: SetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a set to a workout exercise."""
    we = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutExercise.id == we_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not we:
        raise HTTPException(status_code=404, detail="Workout exercise not found.")

    ws = SetCreate.model_validate(req)
    new_set = WorkoutSet(
        workout_exercise_id=we_id,
        set_number=ws.set_number,
        repetitions=ws.repetitions,
        weight_kg=ws.weight_kg,
        rest_seconds=ws.rest_seconds,
        is_completed=ws.is_completed,
        notes=ws.notes,
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)
    return new_set


@router.patch("/workout-sets/{set_id}", response_model=SetResponse)
@router.patch("/sets/{set_id}", response_model=SetResponse)
@router.put("/workout-sets/{set_id}", response_model=SetResponse)
@router.put("/sets/{set_id}", response_model=SetResponse)
def update_set(
    set_id: int,
    req: SetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a set's reps, weight, completion, etc."""
    s = (
        db.query(WorkoutSet)
        .join(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutSet.id == set_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Set not found.")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/workout-sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a set."""
    s = (
        db.query(WorkoutSet)
        .join(WorkoutExercise)
        .join(WorkoutSession)
        .filter(WorkoutSet.id == set_id, WorkoutSession.user_id == current_user.id)
        .first()
    )
    if not s:
        raise HTTPException(status_code=404, detail="Set not found.")
    db.delete(s)
    db.commit()

