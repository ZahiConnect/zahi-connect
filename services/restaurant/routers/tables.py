"""
Zahi Connect - Tables Router
Table management: create, list, update status (available/occupied/reserved).
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.table import Table
from schemas.table import TableCreate, TableResponse, TableStatusUpdate

router = APIRouter(tags=["Tables"])


@router.post("/", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
async def create_table(
    data: TableCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    table = Table(tenant_id=tenant_id, **data.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.get("/", response_model=list[TableResponse])
async def list_tables(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Table)
        .where(Table.tenant_id == tenant_id)
        .order_by(Table.table_number)
    )
    return result.scalars().all()


@router.patch("/{table_id}/status", response_model=TableResponse)
async def update_table_status(
    table_id: uuid.UUID,
    data: TableStatusUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Change table status: available ↔ occupied ↔ reserved."""
    result = await db.execute(
        select(Table).where(Table.id == table_id, Table.tenant_id == tenant_id)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    table.status = data.status
    if data.assigned_staff is not None:
        table.assigned_staff = data.assigned_staff

    await db.commit()
    await db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    table_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(Table).where(Table.id == table_id, Table.tenant_id == tenant_id)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    await db.delete(table)
    await db.commit()
