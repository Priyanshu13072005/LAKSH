"""
LAKSH - Auth schemas for registration, login, and token responses.
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse | None" = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    timezone: str
    preferred_weight_unit: str
    height_cm: float | None = None
    weight_kg: float | None = None
    fitness_goal: str | None = None
    profile_pic_url: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    bio: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    timezone: str | None = Field(None, max_length=50)
    preferred_weight_unit: str | None = Field(None, max_length=10)
    height_cm: float | None = Field(None, ge=50, le=300)
    weight_kg: float | None = Field(None, ge=20, le=500)
    fitness_goal: str | None = Field(None, max_length=50)
    profile_pic_url: str | None = Field(None, max_length=512)
    date_of_birth: date | None = None
    gender: str | None = Field(None, max_length=20)
    bio: str | None = Field(None, max_length=500)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)
