"""Table management routes."""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.table import Table
from schemas.table import TableCreate, TableResponse, TableStatusUpdate, TableUpdate
from services.order_service import OrderService
from services.realtime import build_restaurant_event, restaurant_realtime

router = APIRouter(tags=["Tables"])


async def load_table_or_404(db: AsyncSession, tenant_id: str, table_id: uuid.UUID) -> Table:
    result = await db.execute(
        select(Table).where(Table.id == table_id, Table.tenant_id == tenant_id)
    )
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


async def ensure_unique_table_number(
    db: AsyncSession,
    tenant_id: str,
    table_number: int,
    excluding_table_id: uuid.UUID | None = None,
) -> None:
    query = select(Table.id).where(
        Table.tenant_id == tenant_id,
        Table.table_number == table_number,
    )
    if excluding_table_id:
        query = query.where(Table.id != excluding_table_id)

    result = await db.execute(query)
    existing_table_id = result.scalar()
    if existing_table_id:
        raise HTTPException(
            status_code=400,
            detail=f"Table {table_number} already exists for this restaurant",
        )


@router.post("/", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
async def create_table(
    data: TableCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await ensure_unique_table_number(db, tenant_id, data.table_number)
    table = Table(tenant_id=tenant_id, **data.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "table.created",
            ["tables", "orders", "dashboard", "reports"],
            table_id=str(table.id),
        ),
    )
    return table


@router.get("/", response_model=list[TableResponse])
async def list_tables(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Table).where(Table.tenant_id == tenant_id).order_by(Table.table_number)
    )
    return result.scalars().all()


@router.patch("/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: uuid.UUID,
    data: TableUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    table = await load_table_or_404(db, tenant_id, table_id)
    update_data = data.model_dump(exclude_unset=True)

    if "table_number" in update_data:
        await ensure_unique_table_number(
            db,
            tenant_id,
            update_data["table_number"],
            excluding_table_id=table_id,
        )

    if "status" in update_data and table.id:
        active_order_count = await OrderService.count_active_orders_for_table(
            db=db,
            tenant_id=tenant_id,
            table_id=table.id,
        )
        if active_order_count > 0 and update_data["status"] != "occupied":
            raise HTTPException(
                status_code=400,
                detail="Tables with active dine-in orders must stay occupied until payment is settled",
            )

    for field, value in update_data.items():
        setattr(table, field, value)

    await db.commit()
    await db.refresh(table)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "table.updated",
            ["tables", "orders", "dashboard", "reports"],
            table_id=str(table.id),
        ),
    )
    return table


@router.patch("/{table_id}/status", response_model=TableResponse)
async def update_table_status(
    table_id: uuid.UUID,
    data: TableStatusUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    table = await load_table_or_404(db, tenant_id, table_id)
    active_order_count = await OrderService.count_active_orders_for_table(
        db=db,
        tenant_id=tenant_id,
        table_id=table.id,
    )
    if active_order_count > 0 and data.status != "occupied":
        raise HTTPException(
            status_code=400,
            detail="Tables with active dine-in orders must stay occupied until payment is settled",
        )

    table.status = data.status
    if data.assigned_staff is not None:
        table.assigned_staff = data.assigned_staff

    await db.commit()
    await db.refresh(table)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "table.status_changed",
            ["tables", "orders", "dashboard", "reports"],
            table_id=str(table.id),
            status=data.status,
        ),
    )
    return table


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(
    table_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    table = await load_table_or_404(db, tenant_id, table_id)
    active_order_count = await OrderService.count_active_orders_for_table(
        db=db,
        tenant_id=tenant_id,
        table_id=table_id,
    )
    if active_order_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a table with active orders",
        )

    await db.delete(table)
    await db.commit()
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "table.deleted",
            ["tables", "orders", "dashboard", "reports"],
            table_id=str(table_id),
        ),
    )
