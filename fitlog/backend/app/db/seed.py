"""
LAKSH - Initial database seeder for built-in gym exercises.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.exercise import Exercise

BUILT_IN_EXERCISES: List[Dict[str, Any]] = [
    {
        "name": "Barbell Bench Press",
        "muscle_group": "Chest",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Standard flat barbell bench press targeting the pectoral muscles.",
        "instructions": "Lie on bench, grip barbell slightly wider than shoulder width. Lower bar to mid-chest and press up smoothly.",
    },
    {
        "name": "Incline Dumbbell Press",
        "muscle_group": "Chest",
        "equipment": "Dumbbells",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Incline bench press emphasizing the clavicular head of the pectoralis major.",
        "instructions": "Set bench to 30-45 degrees. Press dumbbells upward, squeezing chest at the top.",
    },
    {
        "name": "Barbell Back Squat",
        "muscle_group": "Quadriceps",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Compound lower body exercise targeting quads, glutes, and core.",
        "instructions": "Rest bar on upper traps. Squat down until thighs are parallel to the ground, keep chest tall, then drive back up.",
    },
    {
        "name": "Conventional Deadlift",
        "muscle_group": "Back",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Foundational posterior chain compound movement.",
        "instructions": "Stand with feet hip-width. Hinge at hips and bend knees. Lift bar by extending hips and knees to full lockout.",
    },
    {
        "name": "Overhead Barbell Press",
        "muscle_group": "Shoulders",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Standing overhead shoulder press targeting anterior deltoids and triceps.",
        "instructions": "Grip bar just outside shoulders. Press bar vertically overhead until elbows lock out.",
    },
    {
        "name": "Lat Pulldown",
        "muscle_group": "Back",
        "equipment": "Cable",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Cable exercise targeting the latissimus dorsi.",
        "instructions": "Sit with thighs secured. Pull bar down towards upper chest while driving elbows downward.",
    },
    {
        "name": "Barbell Bent-Over Row",
        "muscle_group": "Back",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Horizontal pulling compound exercise targeting middle and upper back.",
        "instructions": "Hinge forward with flat back. Pull bar towards lower abdomen, pinching shoulder blades together.",
    },
    {
        "name": "Pull-Up",
        "muscle_group": "Back",
        "equipment": "Bodyweight",
        "category": "Strength",
        "uses_external_weight": False,
        "description": "Classic bodyweight vertical pulling movement.",
        "instructions": "Pronated grip on bar. Pull chest up toward the bar, lower under control.",
    },
    {
        "name": "Dumbbell Bicep Curl",
        "muscle_group": "Biceps",
        "equipment": "Dumbbells",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Isolation exercise targeting the biceps brachii.",
        "instructions": "Stand upright with dumbbells. Curl weights towards shoulders while keeping elbows stationary.",
    },
    {
        "name": "Triceps Rope Pushdown",
        "muscle_group": "Triceps",
        "equipment": "Cable",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Cable isolation exercise targeting the lateral and medial heads of the triceps.",
        "instructions": "Grip rope attachment with elbows tucked at sides. Extend elbows fully and flare rope slightly at bottom.",
    },
    {
        "name": "Leg Press",
        "muscle_group": "Quadriceps",
        "equipment": "Machine",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Machine-based compound leg pressing exercise.",
        "instructions": "Place feet shoulder-width on platform. Lower sled under control until knees reach 90 degrees, then press up.",
    },
    {
        "name": "Romanian Deadlift (RDL)",
        "muscle_group": "Hamstrings",
        "equipment": "Barbell",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Hip-hinge movement targeting hamstrings and glutes.",
        "instructions": "Hinge backward at hips with slight knee bend. Lower barbell along shins until feeling stretch, drive hips forward.",
    },
    {
        "name": "Lateral Dumbbell Raise",
        "muscle_group": "Shoulders",
        "equipment": "Dumbbells",
        "category": "Strength",
        "uses_external_weight": True,
        "description": "Isolation movement targeting lateral deltoids for shoulder width.",
        "instructions": "Raise dumbbells out to the sides until parallel with shoulders, lead with elbows.",
    },
    {
        "name": "Hanging Leg Raise",
        "muscle_group": "Abs",
        "equipment": "Bodyweight",
        "category": "Core",
        "uses_external_weight": False,
        "description": "Advanced core exercise targeting lower abdominals and hip flexors.",
        "instructions": "Hang from pull-up bar. Contract abs and raise legs upward without swinging.",
    },
    {
        "name": "Plank",
        "muscle_group": "Abs",
        "equipment": "Bodyweight",
        "category": "Core",
        "uses_external_weight": False,
        "description": "Isometric core exercise building anterior core stability.",
        "instructions": "Hold push-up or forearm position with straight spine and braced core.",
    },
]


def seed_exercises(db: Session) -> int:
    """Seed default exercises if the table has no built-in exercises."""
    count = db.query(Exercise).filter(Exercise.owner_user_id.is_(None)).count()
    if count > 0:
        return 0

    added = 0
    for data in BUILT_IN_EXERCISES:
        ex = Exercise(**data, owner_user_id=None)
        db.add(ex)
        added += 1

    db.commit()
    return added
