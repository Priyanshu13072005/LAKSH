"""
LAKSH - Workout Templates router: CRUD for routines + start workout from template.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timezone, date as date_type

from app.db.session import get_db
from app.models.user import User
from app.models.exercise import Exercise
from app.models.workout import WorkoutSession
from app.models.workout_exercise import WorkoutExercise
from app.models.workout_set import WorkoutSet
from app.models.workout_template import WorkoutTemplate, WorkoutTemplateExercise
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateSummary,
    TemplateExerciseCreate,
    TemplateExerciseUpdate,
    TemplateExerciseResponse,
)
from app.dependencies.auth import get_current_user

router = APIRouter(tags=["Templates"])


# ─── Helpers ──────────────────────────────────────────────────────
def _enrich_template_exercise(te: WorkoutTemplateExercise) -> dict:
    return {
        "id": te.id,
        "template_id": te.template_id,
        "exercise_id": te.exercise_id,
        "order_index": te.order_index,
        "default_sets": te.default_sets,
        "default_reps": te.default_reps,
        "default_weight_kg": te.default_weight_kg,
        "rest_seconds": te.rest_seconds,
        "notes": te.notes,
        "exercise_name": te.exercise.name if te.exercise else None,
        "muscle_group": te.exercise.muscle_group if te.exercise else None,
        "equipment": te.exercise.equipment if te.exercise else None,
    }


def _build_template_response(tmpl: WorkoutTemplate) -> dict:
    exercises = [_enrich_template_exercise(te) for te in tmpl.exercises]
    return {
        "id": tmpl.id,
        "user_id": tmpl.user_id,
        "name": tmpl.name,
        "description": tmpl.description,
        "icon": tmpl.icon,
        "color": tmpl.color,
        "created_at": tmpl.created_at,
        "updated_at": tmpl.updated_at,
        "exercises": exercises,
        "exercise_count": len(exercises),
    }


def _load_template(db: Session, template_id: int, user_id: int):
    return (
        db.query(WorkoutTemplate)
        .options(
            joinedload(WorkoutTemplate.exercises).joinedload(
                WorkoutTemplateExercise.exercise
            )
        )
        .filter(WorkoutTemplate.id == template_id, WorkoutTemplate.user_id == user_id)
        .first()
    )


# ─── Template CRUD ───────────────────────────────────────────────
@router.post(
    "/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED
)
def create_template(
    req: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workout template (routine)."""
    tmpl = WorkoutTemplate(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        icon=req.icon,
        color=req.color,
    )
    db.add(tmpl)
    db.flush()

    for ex_data in req.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == ex_data.exercise_id).first()
        if not exercise:
            raise HTTPException(
                status_code=404, detail=f"Exercise ID {ex_data.exercise_id} not found."
            )
        te = WorkoutTemplateExercise(
            template_id=tmpl.id,
            exercise_id=ex_data.exercise_id,
            order_index=ex_data.order_index,
            default_sets=ex_data.default_sets,
            default_reps=ex_data.default_reps,
            default_weight_kg=ex_data.default_weight_kg,
            rest_seconds=ex_data.rest_seconds,
            notes=ex_data.notes,
        )
        db.add(te)

    db.commit()
    tmpl = _load_template(db, tmpl.id, current_user.id)
    return _build_template_response(tmpl)


@router.get("/templates", response_model=list[TemplateSummary])
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workout templates for the current user."""
    templates = (
        db.query(WorkoutTemplate)
        .options(joinedload(WorkoutTemplate.exercises))
        .filter(WorkoutTemplate.user_id == current_user.id)
        .order_by(WorkoutTemplate.updated_at.desc())
        .all()
    )
    return [
        TemplateSummary(
            id=t.id,
            name=t.name,
            description=t.description,
            icon=t.icon,
            color=t.color,
            exercise_count=len(t.exercises),
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.get("/templates/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a workout template with all exercises."""
    tmpl = _load_template(db, template_id, current_user.id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    return _build_template_response(tmpl)


@router.patch("/templates/{template_id}", response_model=TemplateResponse)
@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    req: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a template's name, description, icon, or color."""
    tmpl = _load_template(db, template_id, current_user.id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(tmpl, field, value)
    db.commit()
    tmpl = _load_template(db, template_id, current_user.id)
    return _build_template_response(tmpl)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a workout template."""
    tmpl = (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.user_id == current_user.id,
        )
        .first()
    )
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(tmpl)
    db.commit()


# ─── Template Exercises ──────────────────────────────────────────
@router.post(
    "/templates/{template_id}/exercises",
    response_model=TemplateExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_exercise_to_template(
    template_id: int,
    req: TemplateExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an exercise to a template."""
    tmpl = (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.user_id == current_user.id,
        )
        .first()
    )
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")

    exercise = db.query(Exercise).filter(Exercise.id == req.exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found.")

    te = WorkoutTemplateExercise(
        template_id=template_id,
        exercise_id=req.exercise_id,
        order_index=req.order_index,
        default_sets=req.default_sets,
        default_reps=req.default_reps,
        default_weight_kg=req.default_weight_kg,
        rest_seconds=req.rest_seconds,
        notes=req.notes,
    )
    db.add(te)
    db.commit()
    db.refresh(te)
    return _enrich_template_exercise(te)


@router.delete(
    "/template-exercises/{te_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_template_exercise(
    te_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an exercise from a template."""
    te = (
        db.query(WorkoutTemplateExercise)
        .join(WorkoutTemplate)
        .filter(
            WorkoutTemplateExercise.id == te_id,
            WorkoutTemplate.user_id == current_user.id,
        )
        .first()
    )
    if not te:
        raise HTTPException(
            status_code=404, detail="Template exercise not found."
        )
    db.delete(te)
    db.commit()


# ─── Start Workout From Template ─────────────────────────────────
@router.post(
    "/templates/{template_id}/start",
    status_code=status.HTTP_201_CREATED,
)
def start_workout_from_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new live workout session pre-populated with exercises/sets from a template."""
    tmpl = _load_template(db, template_id, current_user.id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check for existing active workout
    active = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == "IN_PROGRESS",
        )
        .first()
    )
    if active:
        raise HTTPException(
            status_code=409,
            detail="You already have an active workout in progress. Finish or cancel it first.",
        )

    now = datetime.now(timezone.utc)
    today = date_type.today()

    ws = WorkoutSession(
        user_id=current_user.id,
        title=tmpl.name,
        workout_date=today,
        started_at=now,
        status="IN_PROGRESS",
    )
    db.add(ws)
    db.flush()

    for te in tmpl.exercises:
        we = WorkoutExercise(
            workout_session_id=ws.id,
            exercise_id=te.exercise_id,
            order_index=te.order_index,
            notes=te.notes,
        )
        db.add(we)
        db.flush()

        # Pre-populate sets based on template defaults
        for set_num in range(1, (te.default_sets or 3) + 1):
            workout_set = WorkoutSet(
                workout_exercise_id=we.id,
                set_number=set_num,
                repetitions=te.default_reps or 10,
                weight_kg=te.default_weight_kg,
                rest_seconds=te.rest_seconds or 90,
                is_completed=False,
            )
            db.add(workout_set)

    db.commit()

    return {"workout_id": ws.id, "message": f"Started workout from '{tmpl.name}'"}
