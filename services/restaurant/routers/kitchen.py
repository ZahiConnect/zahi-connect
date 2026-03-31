"""Kitchen routes for live preparation workflows."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order
from schemas.order import OrderResponse

router = APIRouter(tags=["Kitchen"])


def kitchen_query(tenant_id: str):
    return (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.table))
        .where(Order.tenant_id == tenant_id)
        .order_by(Order.created_at.asc())
    )


@router.get("/active", response_model=list[OrderResponse])
async def get_active_orders(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        kitchen_query(tenant_id).where(Order.status.in_(["new", "preparing"]))
    )
    return result.scalars().all()


@router.get("/ready", response_model=list[OrderResponse])
async def get_ready_orders(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(kitchen_query(tenant_id).where(Order.status == "ready"))
    return result.scalars().all()


@router.get("/board")
async def get_kitchen_board(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        kitchen_query(tenant_id).where(Order.status.in_(["new", "preparing", "ready"]))
    )
    orders = result.scalars().all()
    serialize = lambda order: OrderResponse.model_validate(order).model_dump(mode="json")

    return {
        "new": [serialize(order) for order in orders if order.status == "new"],
        "preparing": [serialize(order) for order in orders if order.status == "preparing"],
        "ready": [serialize(order) for order in orders if order.status == "ready"],
    }
