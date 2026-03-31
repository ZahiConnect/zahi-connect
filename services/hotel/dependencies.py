import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db


@dataclass
class HotelWorkspaceContext:
    user_id: str
    username: str
    email: str
    role: str
    tenant_id: uuid.UUID


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


async def get_hotel_context(
    payload: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
) -> HotelWorkspaceContext:
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="This account is not attached to a workspace.")

    role = payload.get("role")
    if role not in {"business_admin", "staff"}:
        raise HTTPException(status_code=403, detail="Hotel workspace access is restricted.")

    try:
        tenant_uuid = uuid.UUID(str(tenant_id))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid tenant reference in token.") from exc

    tenant_row = await db.execute(
        text("SELECT business_type FROM tenants WHERE id = :tenant_id"),
        {"tenant_id": tenant_uuid},
    )
    tenant = tenant_row.mappings().first()
    if not tenant or tenant["business_type"] != "hotel":
        raise HTTPException(status_code=403, detail="This workspace is not a hotel workspace.")

    return HotelWorkspaceContext(
        user_id=str(payload.get("user_id") or ""),
        username=str(payload.get("username") or ""),
        email=str(payload.get("email") or ""),
        role=role,
        tenant_id=tenant_uuid,
    )
