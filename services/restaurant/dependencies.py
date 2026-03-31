"""Auth and workspace dependencies for the restaurant service."""

import uuid

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from config import settings


async def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except (ValueError, JWTError):
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(payload: dict = Depends(verify_token)):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")
    return payload


async def get_current_admin(payload: dict = Depends(get_current_user)):
    return payload


async def get_tenant_id(payload: dict = Depends(get_current_user)) -> uuid.UUID:
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        return uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")

    try:
        return uuid.UUID(str(tenant_id))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid tenant reference in token") from exc
