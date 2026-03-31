"""
Zahi Connect - Kitchen Display Router
Provides the KOT (Kitchen Order Ticket) endpoint.
Active orders for the kitchen display screen.
Future: WebSocket support for real-time push.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order
from schemas.order import OrderResponse

router = APIRouter(tags=["Kitchen"])


@router.get("/active", response_model=list[OrderResponse])
async def get_active_orders(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Get all active KOT orders (new + preparing).
    This feeds the Kitchen Display screen.
    Orders are sorted by creation time (oldest first — FIFO).
    """
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.tenant_id == tenant_id,
            Order.status.in_(["new", "preparing"]),
        )
        .order_by(Order.created_at.asc())
    )
    return result.scalars().all()


@router.get("/ready", response_model=list[OrderResponse])
async def get_ready_orders(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get orders that are ready to be served."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.tenant_id == tenant_id,
            Order.status == "ready",
        )
        .order_by(Order.created_at.asc())
    )
    return result.scalars().all()
