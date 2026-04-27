"""Billing and settlement routes for restaurant cashiers or accountants."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order
from schemas.order import OrderResponse, PaymentSettlementRequest
from services.customer_booking_sync import sync_customer_booking_for_order
from services.order_service import OrderService
from services.realtime import build_restaurant_event, restaurant_realtime

router = APIRouter(tags=["Billing"])

order_service = OrderService()


def billing_query(tenant_id):
    return (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.table))
        .where(Order.tenant_id == tenant_id)
    )


async def load_order_or_404(db: AsyncSession, tenant_id, order_id: uuid.UUID) -> Order:
    result = await db.execute(billing_query(tenant_id).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def serialize(order: Order) -> dict:
    return OrderResponse.model_validate(order).model_dump(mode="json")


@router.get("/board")
async def get_billing_board(
    tenant_id=Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    pending_result = await db.execute(
        billing_query(tenant_id)
        .where(Order.status == "served")
        .order_by(Order.served_at.desc().nullslast(), Order.updated_at.desc())
        .limit(100)
    )
    pending_orders = pending_result.scalars().all()

    recent_settlements_result = await db.execute(
        billing_query(tenant_id)
        .where(Order.status == "completed")
        .order_by(Order.settled_at.desc().nullslast(), Order.updated_at.desc())
        .limit(12)
    )
    recent_settlements = recent_settlements_result.scalars().all()

    today = datetime.utcnow().date()
    settled_today_amount = sum(
        float(order.total_amount or 0)
        for order in recent_settlements
        if order.settled_at and order.settled_at.date() == today
    )
    settled_today_count = sum(
        1
        for order in recent_settlements
        if order.settled_at and order.settled_at.date() == today
    )

    total_pending_amount = sum(float(order.total_amount or 0) for order in pending_orders)

    return {
        "pending": [serialize(order) for order in pending_orders],
        "recent_settlements": [serialize(order) for order in recent_settlements],
        "pending_count": len(pending_orders),
        "pending_amount": total_pending_amount,
        "settled_today_count": settled_today_count,
        "settled_today_amount": settled_today_amount,
    }


@router.post("/{order_id}/settle", response_model=OrderResponse)
async def settle_payment(
    order_id: uuid.UUID,
    data: PaymentSettlementRequest,
    tenant_id=Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    order = await load_order_or_404(db, tenant_id, order_id)

    if not order_service.validate_status_transition(order.status, "completed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot settle payment from '{order.status}'",
        )

    await order_service.apply_status_update(
        db,
        order,
        "completed",
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
    )
    hydrated_order = await load_order_or_404(db, tenant_id, order_id)
    await sync_customer_booking_for_order(db, hydrated_order)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "billing.settled",
            ["billing", "orders", "tables", "dashboard", "reports"],
            order_id=str(order_id),
            status="completed",
            bill_number=hydrated_order.bill_number,
        ),
    )
    return hydrated_order
