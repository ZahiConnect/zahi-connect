import uuid

from jose import JWTError, jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db


async def verify_token(authorization: str = Header(None)):
    """
    Mirrors MyCalo AI_Services/dependencies.py verify_token exactly.
    Extracts and validates Bearer token from Authorization header.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        return payload

    except (ValueError, JWTError):
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolves the full User object from the JWT payload.
    Also checks account status (mirrors MyCalo's AccountStatusMiddleware).
    """
    from models.user import User

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Mirrors MyCalo's AccountStatusMiddleware
    if not user.is_active or user.status in ("inactive", "suspended"):
        raise HTTPException(
            status_code=403,
            detail="Your account has been suspended by an administrator.",
        )

    return user


async def get_current_admin(current_user=Depends(get_current_user)):
    """Only allow super_admin or business_admin."""
    if current_user.role not in ("super_admin", "business_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_current_super_admin(current_user=Depends(get_current_user)):
    """Only allow super_admin."""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user
