"""
LAKSH - Exercise router: browse, search, create custom exercises.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate, ExerciseResponse
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/exercises", tags=["Exercises"])


from sqlalchemy import or_, func
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(
    search: str | None = Query(None),
    muscle_group: str | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List built-in + user's custom exercises, with optional filters and user stats."""
    query = db.query(Exercise).filter(
        or_(Exercise.owner_user_id.is_(None), Exercise.owner_user_id == current_user.id)
    )

    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))
    if muscle_group:
        query = query.filter(Exercise.muscle_group == muscle_group)
    if category:
        query = query.filter(Exercise.category == category)

    exercises = query.order_by(Exercise.name).all()

    # Pre-aggregate completed stats for this user across all exercises
    stats_query = (
        db.query(
            WorkoutExercise.exercise_id,
            func.count(WorkoutSet.id).label("total_sets"),
            func.coalesce(func.sum(WorkoutSet.repetitions), 0).label("total_reps"),
            func.coalesce(func.sum(WorkoutSet.repetitions * func.coalesce(WorkoutSet.weight_kg, 0.0)), 0.0).label("total_volume"),
            func.max(WorkoutSet.weight_kg).label("pr_weight"),
            func.max(WorkoutSet.repetitions).label("pr_reps"),
        )
        .join(WorkoutSession, WorkoutExercise.workout_session_id == WorkoutSession.id)
        .join(WorkoutSet, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSet.is_completed == True,
        )
        .group_by(WorkoutExercise.exercise_id)
        .all()
    )

    stats_map = {
        row.exercise_id: {
            "total_sets": int(row.total_sets),
            "total_reps": int(row.total_reps),
            "total_volume": round(float(row.total_volume), 2),
            "personal_record_weight": float(row.pr_weight) if row.pr_weight is not None else None,
            "personal_record_reps": int(row.pr_reps) if row.pr_reps is not None else None,
        }
        for row in stats_query
    }

    results = []
    for ex in exercises:
        ex_stats = stats_map.get(ex.id, {
            "total_sets": 0,
            "total_reps": 0,
            "total_volume": 0.0,
            "personal_record_weight": None,
            "personal_record_reps": None,
        })
        ex_dict = {
            "id": ex.id,
            "name": ex.name,
            "muscle_group": ex.muscle_group,
            "equipment": ex.equipment,
            "category": ex.category,
            "uses_external_weight": ex.uses_external_weight,
            "description": ex.description,
            "instructions": ex.instructions,
            "owner_user_id": ex.owner_user_id,
            "created_at": ex.created_at,
            **ex_stats,
        }
        results.append(ExerciseResponse.model_validate(ex_dict))

    return results



@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single exercise by ID (must be built-in or owned by user)."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    if exercise.owner_user_id and exercise.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return exercise


@router.post("", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(
    req: ExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a custom exercise owned by the current user."""
    exercise = Exercise(
        name=req.name,
        muscle_group=req.muscle_group,
        equipment=req.equipment,
        category=req.category,
        uses_external_weight=req.uses_external_weight,
        description=req.description,
        instructions=req.instructions,
        owner_user_id=current_user.id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    req: ExerciseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a custom exercise (only owner can edit)."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    if exercise.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit built-in or others' exercises.")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(exercise, field, value)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom exercise (only owner can delete)."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    if exercise.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete built-in or others' exercises.")

    db.delete(exercise)
    db.commit()
