import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from config import settings


@dataclass
class CustomerContext:
    user_id: uuid.UUID
    username: str
    email: str
    role: str


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


async def get_customer_context(payload: dict = Depends(verify_token)) -> CustomerContext:
    if payload.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Booking requests are only available to customer accounts.")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")

    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid user reference in token.") from exc

    return CustomerContext(
        user_id=user_uuid,
        username=str(payload.get("username") or ""),
        email=str(payload.get("email") or ""),
        role="customer",
    )
