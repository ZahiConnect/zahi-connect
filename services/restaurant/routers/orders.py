"""
Zahi Connect - Orders Router
Order lifecycle: create → accept → prepare → ready → complete
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.exceptions import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order, OrderItem
from schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from services.order_service import OrderService

router = APIRouter(tags=["Orders"])

order_service = OrderService()


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Create a new order with items."""
    order = await order_service.create_order(
        db=db,
        tenant_id=tenant_id,
        order_data=data.model_dump(exclude={"items"}),
        items_data=[item.model_dump() for item in data.items],
    )

    # Reload with items
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    order_type: str | None = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """List orders — filter by status or order_type."""
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.tenant_id == tenant_id)
    )

    if status_filter:
        query = query.where(Order.status == status_filter)
    if order_type:
        query = query.where(Order.order_type == order_type)

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Update order status (new → preparing → ready → completed)."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Validate transition
    if not order_service.validate_status_transition(order.status, data.status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{order.status}' to '{data.status}'",
        )

    order.status = data.status
    await db.commit()
    await db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(
    order_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Cancel an order (only if still 'new')."""
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "new":
        raise HTTPException(status_code=400, detail="Can only cancel orders with status 'new'")

    order.status = "cancelled"
    await db.commit()
