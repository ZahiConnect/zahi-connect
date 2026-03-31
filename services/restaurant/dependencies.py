"""
Zahi Connect - Restaurant Service Dependencies
Reuses the same JWT verification as accounts service.
"""

from jose import JWTError, jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db


async def verify_token(authorization: str = Header(None)):
    """Same verify_token as accounts service."""
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


async def get_current_user(payload: dict = Depends(verify_token)):
    """Returns the JWT payload with user info (no DB lookup needed here)."""
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")
    return payload


async def get_current_admin(payload: dict = Depends(get_current_user)):
    """Temporarily bypassed: allow anyone for testing."""
    # if payload.get("role") not in ("super_admin", "business_admin"):
    #     raise HTTPException(status_code=403, detail="Admin access required")
    return payload


async def get_tenant_id(payload: dict = Depends(get_current_user)) -> str:
    """Extract tenant_id from JWT — fallback for testing if none."""
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        # Fallback dummy UUID for testing purposes if 'customer' was registered without one
        return "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    return tenant_id
