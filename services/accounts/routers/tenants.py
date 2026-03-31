"""
Zahi Connect - Tenants Router
Super Admin manages business accounts (hotels, restaurants, agencies).
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_super_admin
from models.user import Tenant, User
from schemas.auth import TenantCreateSchema, TenantResponseSchema

router = APIRouter(tags=["Tenants"])


@router.post("/", response_model=TenantResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: TenantCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """Create a new tenant (Super Admin only)."""
    result = await db.execute(select(Tenant).where(Tenant.slug == data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant with this slug already exists.",
        )
    tenant = Tenant(**data.model_dump())
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/", response_model=list[TenantResponseSchema])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """List all tenants (Super Admin only)."""
    result = await db.execute(select(Tenant).order_by(Tenant.created_at))
    return result.scalars().all()


@router.get("/{tenant_id}", response_model=TenantResponseSchema)
async def get_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """Get tenant by ID (Super Admin only)."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_super_admin),
):
    """Delete tenant (Super Admin only)."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    await db.delete(tenant)
    await db.commit()
