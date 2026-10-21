"""
LAKSH - Workout router: sessions, exercises within sessions, sets.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone, date
import io
import csv
import json
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
    data = {}
    for c in ws.__table__.columns:
        val = getattr(ws, c.name)
        if isinstance(val, datetime) and val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        data[c.name] = val
    return {
        **data,
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
        set_type=ws.set_type,
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


# ─── Previous Performance (Ghost Data) ──────────────────────────
@router.get("/exercises/{exercise_id}/previous-sets")
def get_previous_sets(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the user's most recent completed performance for a specific exercise.
    Returns the sets from the latest COMPLETED workout that included this exercise.
    Used to display 'ghost data' placeholders during active workouts.
    """
    # Find the most recent completed workout that contained this exercise
    latest_we = (
        db.query(WorkoutExercise)
        .join(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "COMPLETED",
            WorkoutExercise.exercise_id == exercise_id,
        )
        .order_by(WorkoutSession.workout_date.desc(), WorkoutSession.started_at.desc())
        .first()
    )

    if not latest_we:
        return {"exercise_id": exercise_id, "previous_sets": [], "workout_date": None}

    # Load sets for that workout exercise
    sets_data = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.workout_exercise_id == latest_we.id,
            WorkoutSet.is_completed == True,
        )
        .order_by(WorkoutSet.set_number)
        .all()
    )

    workout_session = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.id == latest_we.workout_session_id)
        .first()
    )

    return {
        "exercise_id": exercise_id,
        "workout_date": str(workout_session.workout_date) if workout_session else None,
        "previous_sets": [
            {
                "set_number": s.set_number,
                "weight_kg": s.weight_kg,
                "repetitions": s.repetitions,
                "set_type": getattr(s, "set_type", "NORMAL"),
            }
            for s in sets_data
        ],
    }


# ─── Data Export Endpoints (CSV & JSON) ─────────────────────────
@router.get("/export/csv", summary="Export all workouts and sets as CSV")
def export_workouts_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a downloadable CSV file containing every logged set and workout."""
    workouts = (
        db.query(WorkoutSession)
        .options(
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.exercise),
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.sets),
        )
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.workout_date.desc(), WorkoutSession.started_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Workout ID",
        "Workout Date",
        "Workout Title",
        "Duration (Mins)",
        "Status",
        "Exercise Name",
        "Muscle Group",
        "Equipment",
        "Set Number",
        "Set Type",
        "Weight (kg)",
        "Repetitions",
        "Completed",
        "Set Volume (kg)",
        "Set Notes",
    ])

    for w in workouts:
        duration_mins = round((w.duration_seconds or 0) / 60, 1)
        for we in w.exercises:
            ex_name = we.exercise.name if we.exercise else "Unknown"
            m_group = we.exercise.muscle_group if we.exercise else ""
            equip = we.exercise.equipment if we.exercise else ""
            for s in we.sets:
                w_kg = s.weight_kg or 0.0
                volume = round(w_kg * s.repetitions, 2) if s.is_completed else 0.0
                writer.writerow([
                    w.id,
                    w.workout_date.isoformat() if w.workout_date else "",
                    w.title,
                    duration_mins,
                    w.status,
                    ex_name,
                    m_group,
                    equip,
                    s.set_number,
                    getattr(s, "set_type", "NORMAL"),
                    s.weight_kg if s.weight_kg is not None else "",
                    s.repetitions,
                    "Yes" if s.is_completed else "No",
                    volume,
                    s.notes or "",
                ])

    csv_data = output.getvalue()
    filename = f"laksh_workouts_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/json", summary="Export all workouts and sets as JSON")
def export_workouts_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a downloadable JSON backup of all workouts and sets."""
    workouts = (
        db.query(WorkoutSession)
        .options(
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.exercise),
            joinedload(WorkoutSession.exercises)
            .joinedload(WorkoutExercise.sets),
        )
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.workout_date.desc(), WorkoutSession.started_at.desc())
        .all()
    )

    data = []
    for w in workouts:
        w_dict = {
            "id": w.id,
            "title": w.title,
            "workout_date": w.workout_date.isoformat() if w.workout_date else None,
            "started_at": w.started_at.isoformat() if w.started_at else None,
            "ended_at": w.ended_at.isoformat() if w.ended_at else None,
            "duration_seconds": w.duration_seconds,
            "status": w.status,
            "notes": w.notes,
            "exercises": [],
        }
        for we in w.exercises:
            we_dict = {
                "id": we.id,
                "order_index": we.order_index,
                "notes": we.notes,
                "exercise_name": we.exercise.name if we.exercise else None,
                "muscle_group": we.exercise.muscle_group if we.exercise else None,
                "equipment": we.exercise.equipment if we.exercise else None,
                "sets": [
                    {
                        "id": s.id,
                        "set_number": s.set_number,
                        "weight_kg": s.weight_kg,
                        "repetitions": s.repetitions,
                        "set_type": getattr(s, "set_type", "NORMAL"),
                        "is_completed": s.is_completed,
                        "notes": s.notes,
                    }
                    for s in we.sets
                ],
            }
            w_dict["exercises"].append(we_dict)
        data.append(w_dict)

    json_str = json.dumps({"workouts": data, "exported_at": datetime.now(timezone.utc).isoformat()}, indent=2)
    filename = f"laksh_backup_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


