import uuid

from fastapi import APIRouter, Depends, Response, status
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.user import Tenant, WorkspaceMembership, User
from services.auth_service import AuthService
from services.user_payload import build_authenticated_user_payload

router = APIRouter(tags=["Workspaces"])

auth = AuthService()


class WorkspaceSwitchSchema(BaseModel):
    tenant_id: uuid.UUID


@router.get("")
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = await build_authenticated_user_payload(db, current_user)
    return {
        "tenant_id": payload["tenant_id"],
        "workspaces": payload["workspaces"],
        "workspace_count": payload["workspace_count"],
    }


@router.post("/switch")
async def switch_workspace(
    data: WorkspaceSwitchSchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkspaceMembership, Tenant)
        .join(Tenant, WorkspaceMembership.tenant_id == Tenant.id)
        .where(
            WorkspaceMembership.user_id == current_user.id,
            WorkspaceMembership.tenant_id == data.tenant_id,
            Tenant.is_active.is_(True),
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected workspace is not available for this account.",
        )

    membership, tenant = row
    current_user.tenant_id = tenant.id
    current_user.role = membership.role
    await db.commit()
    await db.refresh(current_user)

    token_data = auth.build_token_data(current_user)
    access_token = auth.create_access_token(token_data)
    refresh_token = auth.create_refresh_token(token_data)
    auth.set_refresh_cookie(response, refresh_token)
    user_payload = await build_authenticated_user_payload(db, current_user)

    return {
        "access": access_token,
        **user_payload,
    }
