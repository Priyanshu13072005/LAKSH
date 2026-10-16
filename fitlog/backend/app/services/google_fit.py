"""
LAKSH - Google Fit Integration Service
Connects to Google Fitness REST API to automatically sync step counts.
Health Connect on Android automatically synchronizes steps with Google Fit.
"""

import httpx
from datetime import datetime, date, time, timezone
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User
from app.models.daily_activity import DailyActivity

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_FIT_AGGREGATE_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

FITNESS_ACTIVITY_READ_SCOPE = "https://www.googleapis.com/auth/fitness.activity.read"


def get_google_auth_url(state: str = "") -> str:
    """Generate the OAuth consent screen URL for Google Fit."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": FITNESS_ACTIVITY_READ_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    if state:
        params["state"] = state
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query_string}"


async def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for access and refresh tokens."""
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    """Obtain a fresh access token using the stored refresh token."""
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        resp.raise_for_status()
        tokens = resp.json()
        return tokens.get("access_token")


async def fetch_steps_from_google_fit(access_token: str, target_date: date) -> int:
    """Query Google Fitness Aggregated Dataset API for steps on a specific date."""
    start_dt = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

    start_millis = int(start_dt.timestamp() * 1000)
    end_millis = int(end_dt.timestamp() * 1000)

    payload = {
        "aggregateBy": [
            {
                "dataTypeName": "com.google.step_count.delta",
                "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
            }
        ],
        "bucketByTime": {"durationMillis": 86400000},
        "startTimeMillis": start_millis,
        "endTimeMillis": end_millis,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(GOOGLE_FIT_AGGREGATE_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    total_steps = 0
    for bucket in data.get("bucket", []):
        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                for val in point.get("value", []):
                    if "intVal" in val:
                        total_steps += val["intVal"]

    return total_steps


async def sync_user_steps(db: Session, user: User, target_date: date) -> int:
    """Sync steps from Google Fit to DailyActivity in MySQL."""
    if not user.google_fit_refresh_token:
        raise ValueError("Google Fit is not connected for this user.")

    access_token = await refresh_access_token(user.google_fit_refresh_token)
    steps = await fetch_steps_from_google_fit(access_token, target_date)

    # Upsert into MySQL DailyActivity
    record = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == user.id,
            DailyActivity.activity_date == target_date,
        )
        .first()
    )
    if record:
        record.steps = max(record.steps, steps)
    else:
        record = DailyActivity(
            user_id=user.id,
            activity_date=target_date,
            steps=steps,
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record.steps
