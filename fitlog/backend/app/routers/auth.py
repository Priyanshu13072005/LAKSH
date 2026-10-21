"""
LAKSH - Auth router: registration, login, profile, password change.
"""

import os
import uuid
import time
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.user_goal import UserGoal
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB

UPLOAD_BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
)
PROFILE_PICS_DIR = os.path.join(UPLOAD_BASE_DIR, "profile_pics")
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.flush()

    # Create default goals for the new user
    goal = UserGoal(user_id=user.id)
    db.add(goal)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Log in and receive an access token."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile fields."""
    update_fields = [
        "name", "timezone", "preferred_weight_unit",
        "height_cm", "weight_kg", "fitness_goal",
        "profile_pic_url", "date_of_birth", "gender", "bio",
    ]
    for field in update_fields:
        value = getattr(req, field, None)
        if value is not None:
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password", status_code=status.HTTP_200_OK)
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the authenticated user's password."""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"detail": "Password updated successfully."}


@router.post("/profile-photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace current user's profile photo."""
    filename = file.filename or "avatar.jpg"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension ({ext}). Allowed image formats: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    if file.content_type and file.content_type not in ALLOWED_IMAGE_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type ({file.content_type}). Please upload a JPEG, PNG, WEBP, or GIF image.",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo exceeds the 5MB size limit. Please choose a smaller image.",
        )

    # Cleanup previously uploaded file if present
    if current_user.profile_pic_url and "/uploads/profile_pics/" in current_user.profile_pic_url:
        old_file = current_user.profile_pic_url.split("/uploads/profile_pics/")[-1]
        old_path = os.path.join(PROFILE_PICS_DIR, old_file)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    unique_filename = f"user_{current_user.id}_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(PROFILE_PICS_DIR, unique_filename)

    with open(dest_path, "wb") as f:
        f.write(contents)

    relative_url = f"/api/uploads/profile_pics/{unique_filename}"
    current_user.profile_pic_url = relative_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/profile-photo", response_model=UserResponse)
def delete_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove current user's profile photo and reset to initials."""
    if current_user.profile_pic_url and "/uploads/profile_pics/" in current_user.profile_pic_url:
        old_file = current_user.profile_pic_url.split("/uploads/profile_pics/")[-1]
        old_path = os.path.join(PROFILE_PICS_DIR, old_file)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    current_user.profile_pic_url = None
    db.commit()
    db.refresh(current_user)
    return current_user
