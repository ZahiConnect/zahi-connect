"""Service handoff routes for attendants and delivery staff."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user, get_tenant_id
from models.order import Order
from schemas.order import OrderResponse, ServiceClaimRequest, ServiceServeRequest
from services.customer_booking_sync import sync_customer_booking_for_order
from services.order_service import OrderService
from services.realtime import build_restaurant_event, restaurant_realtime

router = APIRouter(tags=["Service"])

order_service = OrderService()


def service_query(tenant_id):
    return (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.table))
        .where(Order.tenant_id == tenant_id)
    )


async def load_order_or_404(db: AsyncSession, tenant_id, order_id: uuid.UUID) -> Order:
    result = await db.execute(service_query(tenant_id).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def serialize(order: Order) -> dict:
    return OrderResponse.model_validate(order).model_dump(mode="json")


def resolve_actor_name(user_payload: dict, fallback: str | None = None) -> str:
    if fallback and fallback.strip():
        return fallback.strip()
    return user_payload.get("username") or user_payload.get("email") or "Service Staff"


@router.get("/board")
async def get_service_board(
    tenant_id=Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    live_result = await db.execute(
        service_query(tenant_id)
        .where(Order.status.in_(["ready", "out_for_service", "out_for_delivery"]))
        .order_by(Order.updated_at.asc(), Order.created_at.asc())
    )
    live_orders = live_result.scalars().all()

    recent_served_result = await db.execute(
        service_query(tenant_id)
        .where(Order.status.in_(["served", "completed"]))
        .order_by(Order.served_at.desc().nullslast(), Order.updated_at.desc())
        .limit(8)
    )
    recent_served = recent_served_result.scalars().all()

    ready_orders = [order for order in live_orders if order.status == "ready"]
    active_orders = [order for order in live_orders if order.status != "ready"]

    return {
        "ready_dine_in": [
            serialize(order) for order in ready_orders if order.order_type == "dine_in"
        ],
        "ready_delivery": [
            serialize(order) for order in ready_orders if order.order_type != "dine_in"
        ],
        "active_dine_in": [
            serialize(order) for order in active_orders if order.status == "out_for_service"
        ],
        "active_delivery": [
            serialize(order) for order in active_orders if order.status == "out_for_delivery"
        ],
        "recent_served": [serialize(order) for order in recent_served],
    }


@router.post("/{order_id}/claim", response_model=OrderResponse)
async def claim_service_order(
    order_id: uuid.UUID,
    data: ServiceClaimRequest,
    tenant_id=Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    order = await load_order_or_404(db, tenant_id, order_id)
    target_status = "out_for_service" if order.order_type == "dine_in" else "out_for_delivery"

    if order.status == target_status:
        return order

    if not order_service.validate_status_transition(order.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot claim an order from '{order.status}'",
        )

    await order_service.apply_status_update(
        db,
        order,
        target_status,
        service_assignee=resolve_actor_name(current_user, data.service_assignee),
    )
    hydrated_order = await load_order_or_404(db, tenant_id, order_id)
    await sync_customer_booking_for_order(db, hydrated_order)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "service.claimed",
            ["kitchen", "service", "orders", "dashboard", "reports"],
            order_id=str(order_id),
            status=target_status,
        ),
    )
    return hydrated_order


@router.post("/{order_id}/served", response_model=OrderResponse)
async def mark_order_served(
    order_id: uuid.UUID,
    data: ServiceServeRequest,
    tenant_id=Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    order = await load_order_or_404(db, tenant_id, order_id)

    if order.status == "served":
        return order

    if not order_service.validate_status_transition(order.status, "served"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark an order as served from '{order.status}'",
        )

    await order_service.apply_status_update(
        db,
        order,
        "served",
        service_assignee=resolve_actor_name(current_user, data.service_assignee),
    )
    hydrated_order = await load_order_or_404(db, tenant_id, order_id)
    await sync_customer_booking_for_order(db, hydrated_order)
    await restaurant_realtime.broadcast(
        str(tenant_id),
        build_restaurant_event(
            "service.served",
            ["service", "billing", "orders", "tables", "dashboard", "reports"],
            order_id=str(order_id),
            status="served",
            bill_number=hydrated_order.bill_number,
        ),
    )
    return hydrated_order
