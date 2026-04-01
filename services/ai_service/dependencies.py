from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from config import settings


async def get_authorization_header(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    return authorization


async def verify_token(authorization: str = Depends(get_authorization_header)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except (ValueError, JWTError) as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def get_current_user(payload: dict = Depends(verify_token)) -> dict:
    user_id = payload.get("user_id")
    tenant_id = payload.get("tenant_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Token payload missing tenant_id")

    return payload
