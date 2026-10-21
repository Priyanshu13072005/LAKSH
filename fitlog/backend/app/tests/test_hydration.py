"""
Tests for hydration tracking and daily intake aggregation.
"""

from app.models.water_intake import WaterIntake
from datetime import date, datetime, timezone


def test_water_intake_model_attributes():
    intake = WaterIntake(
        id=1,
        user_id=1,
        date=date(2026, 10, 21),
        amount_ml=500,
        logged_at=datetime.now(timezone.utc),
    )
    assert intake.amount_ml == 500
    assert intake.date == date(2026, 10, 21)
    assert intake.user_id == 1


def test_water_intake_total_calculation():
    intakes = [
        WaterIntake(id=1, user_id=1, date=date.today(), amount_ml=250),
        WaterIntake(id=2, user_id=1, date=date.today(), amount_ml=500),
        WaterIntake(id=3, user_id=1, date=date.today(), amount_ml=750),
    ]
    total_ml = sum(i.amount_ml for i in intakes)
    assert total_ml == 1500
    target_ml = 3000
    progress_percentage = min(100, round((total_ml / target_ml) * 100))
    assert progress_percentage == 50
