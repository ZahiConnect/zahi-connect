"""Order routes for creation, listing, and lifecycle changes."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order
from schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from services.order_service import OrderService

router = APIRouter(tags=["Orders"])

order_service = OrderService()


def order_detail_query(tenant_id: str):
    return (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.table))
        .where(Order.tenant_id == tenant_id)
    )


async def load_order_or_404(
    db: AsyncSession,
    tenant_id: str,
    order_id: uuid.UUID,
) -> Order:
    result = await db.execute(order_detail_query(tenant_id).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    order = await order_service.create_order(
        db=db,
        tenant_id=tenant_id,
        order_data=data.model_dump(exclude={"items"}),
        items_data=[item.model_dump() for item in data.items],
    )
    return await load_order_or_404(db, tenant_id, order.id)


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    order_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    query = order_detail_query(tenant_id)

    if status_filter:
        query = query.where(Order.status == status_filter)
    if order_type:
        query = query.where(Order.order_type == order_type)

    result = await db.execute(query.order_by(Order.created_at.desc()).limit(limit))
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await load_order_or_404(db, tenant_id, order_id)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    order = await load_order_or_404(db, tenant_id, order_id)

    if not order_service.validate_status_transition(order.status, data.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{order.status}' to '{data.status}'",
        )

    await order_service.apply_status_update(db, order, data.status)
    return await load_order_or_404(db, tenant_id, order_id)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(
    order_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    order = await load_order_or_404(db, tenant_id, order_id)

    if order.status != "new":
        raise HTTPException(status_code=400, detail="Can only cancel orders with status 'new'")

    await order_service.apply_status_update(db, order, "cancelled")
