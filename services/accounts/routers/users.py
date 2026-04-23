"""
Zahi Connect - Users Router
Mirrors MyCalo's UserListView, UserDetailView (GET/PUT/PATCH/DELETE).
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_current_user
from models.user import User
from schemas.auth import SelfUserProfileUpdateSchema, UserSchema, UserUpdateSchema
from services.user_payload import build_authenticated_user_payload

router = APIRouter(tags=["Users"])


# Mirrors MyCalo's UserListView
@router.get("/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.patch("/me")
async def update_my_profile(
    data: SelfUserProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a signed-in customer to update their own profile details."""
    update_data = data.model_dump(exclude_unset=True)

    if "username" in update_data:
        username = (update_data.get("username") or "").strip()
        if not username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty.")
        existing_username = await db.execute(
            select(User).where(User.username == username, User.id != current_user.id)
        )
        if existing_username.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That username is already in use.",
            )
        current_user.username = username

    if "email" in update_data:
        email = str(update_data.get("email") or "").strip().lower()
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be empty.")
        existing_email = await db.execute(
            select(User).where(User.email == email, User.id != current_user.id)
        )
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That email is already connected to another account.",
            )
        current_user.email = email

    for field in ("mobile", "first_name", "last_name", "address"):
        if field not in update_data:
            continue
        value = update_data.get(field)
        if isinstance(value, str):
            value = value.strip() or None
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return await build_authenticated_user_payload(db, current_user)


# Mirrors MyCalo's UserListView (queryset = CustomUser.objects.all().order_by("id"))
@router.get("/", response_model=list[UserSchema])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List all users (Admin only)."""
    query = select(User).order_by(User.created_at)

    # Business admin only sees their own tenant's users
    if current_user.role == "business_admin" and current_user.tenant_id:
        query = query.where(User.tenant_id == current_user.tenant_id)

    result = await db.execute(query)
    return result.scalars().all()


# Mirrors MyCalo's UserDetailView GET
@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# Mirrors MyCalo's UserDetailView PATCH + perform_update
@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Partially update a user by ID (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    # Sync is_active with status (same as MyCalo's perform_update)
    if user.status == "inactive" or user.status == "suspended":
        user.is_active = False
    elif user.status == "active":
        user.is_active = True

    await db.commit()
    await db.refresh(user)
    return user


# Mirrors MyCalo's UserDetailView DELETE
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete a user by ID (Admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.delete(user)
    await db.commit()
