from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import Tenant, WorkspaceMembership


async def get_tenant_for_user(db: AsyncSession, tenant_id):
    if not tenant_id:
        return None

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    return result.scalar_one_or_none()


def serialize_workspace(tenant: Tenant, role: str, active_tenant_id) -> dict:
    return {
        "tenant_id": str(tenant.id),
        "tenant_name": tenant.name,
        "business_type": tenant.business_type,
        "plan": tenant.plan or "free",
        "role": role,
        "is_active": bool(active_tenant_id and tenant.id == active_tenant_id),
    }


async def list_user_workspaces(db: AsyncSession, user) -> list[dict]:
    memberships_result = await db.execute(
        select(WorkspaceMembership, Tenant)
        .join(Tenant, WorkspaceMembership.tenant_id == Tenant.id)
        .where(WorkspaceMembership.user_id == user.id, Tenant.is_active.is_(True))
        .order_by(WorkspaceMembership.created_at.asc(), Tenant.created_at.asc())
    )

    workspaces = []
    seen_tenants = set()

    for membership, tenant in memberships_result.all():
        workspaces.append(serialize_workspace(tenant, membership.role, user.tenant_id))
        seen_tenants.add(tenant.id)

    active_tenant = await get_tenant_for_user(db, user.tenant_id)
    if active_tenant and active_tenant.id not in seen_tenants:
        workspaces.append(serialize_workspace(active_tenant, user.role, user.tenant_id))

    return workspaces


def serialize_user_with_tenant(user, tenant=None, workspaces=None):
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "mobile": user.mobile,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "tenant_name": tenant.name if tenant else None,
        "business_type": tenant.business_type if tenant else None,
        "plan": tenant.plan if tenant else "free",
        "workspaces": workspaces or [],
        "workspace_count": len(workspaces or []),
    }


async def build_authenticated_user_payload(db: AsyncSession, user):
    tenant = await get_tenant_for_user(db, user.tenant_id)
    workspaces = await list_user_workspaces(db, user)
    return serialize_user_with_tenant(user, tenant, workspaces)
