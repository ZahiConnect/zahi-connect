"""Reporting routes for restaurant dashboards and insights."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.inventory import InventoryItem
from models.order import Order, OrderItem
from models.table import Table
from schemas.order import OrderResponse

router = APIRouter(tags=["Reports"])


async def fetch_popular_items(
    db: AsyncSession,
    tenant_id,
    days: int,
    limit: int,
):
    since = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(
            OrderItem.item_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("total_revenue"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            Order.tenant_id == tenant_id,
            Order.status == "completed",
            Order.created_at >= since,
        )
        .group_by(OrderItem.item_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )

    return [
        {
            "item_name": row[0],
            "total_sold": int(row[1]),
            "total_revenue": float(row[2] or 0),
        }
        for row in result.all()
    ]


@router.get("/summary")
async def get_daily_summary(
    report_date: date | None = Query(None, description="Date in YYYY-MM-DD format"),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    if not report_date:
        report_date = date.today()

    start = datetime.combine(report_date, datetime.min.time())
    end = start + timedelta(days=1)

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.tenant_id == tenant_id,
            Order.status == "completed",
            Order.created_at >= start,
            Order.created_at < end,
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    status_result = await db.execute(
        select(Order.status, func.count(Order.id))
        .where(
            Order.tenant_id == tenant_id,
            Order.created_at >= start,
            Order.created_at < end,
        )
        .group_by(Order.status)
    )
    status_counts = {row[0]: row[1] for row in status_result.all()}

    source_result = await db.execute(
        select(Order.order_type, func.count(Order.id))
        .where(
            Order.tenant_id == tenant_id,
            Order.created_at >= start,
            Order.created_at < end,
        )
        .group_by(Order.order_type)
    )
    source_counts = {row[0]: row[1] for row in source_result.all()}

    total_orders = sum(status_counts.values())

    return {
        "date": report_date.isoformat(),
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "orders_by_status": status_counts,
        "orders_by_source": source_counts,
    }


@router.get("/popular-items")
async def get_popular_items(
    days: int = Query(default=7, ge=1, le=90),
    limit: int = Query(default=10, ge=1, le=50),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await fetch_popular_items(db=db, tenant_id=tenant_id, days=days, limit=limit)


@router.get("/dashboard")
async def get_dashboard_metrics(
    days: int = Query(default=7, ge=1, le=90),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.tenant_id == tenant_id,
            Order.status == "completed",
            Order.created_at >= since,
        )
    )
    revenue_total = float(revenue_result.scalar() or 0)

    active_orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id,
            Order.status.in_(["new", "preparing", "ready"]),
        )
    )
    active_orders = int(active_orders_result.scalar() or 0)

    completed_orders_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id,
            Order.status == "completed",
            Order.created_at >= since,
        )
    )
    completed_orders = int(completed_orders_result.scalar() or 0)

    table_status_result = await db.execute(
        select(Table.status, func.count(Table.id))
        .where(Table.tenant_id == tenant_id)
        .group_by(Table.status)
    )
    tables_by_status = {row[0]: int(row[1]) for row in table_status_result.all()}

    low_stock_result = await db.execute(
        select(func.count(InventoryItem.id)).where(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.quantity <= InventoryItem.low_stock_threshold,
        )
    )
    low_stock_count = int(low_stock_result.scalar() or 0)

    recent_orders_result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.table))
        .where(Order.tenant_id == tenant_id)
        .order_by(Order.created_at.desc())
        .limit(6)
    )
    recent_orders = recent_orders_result.scalars().all()
    recent_orders_payload = [
        OrderResponse.model_validate(order).model_dump(mode="json")
        for order in recent_orders
    ]

    popular_items = await fetch_popular_items(db=db, tenant_id=tenant_id, days=days, limit=5)

    orders_by_status_result = await db.execute(
        select(Order.status, func.count(Order.id))
        .where(
            Order.tenant_id == tenant_id,
            Order.created_at >= since,
        )
        .group_by(Order.status)
    )
    orders_by_status = {row[0]: int(row[1]) for row in orders_by_status_result.all()}

    orders_by_source_result = await db.execute(
        select(Order.order_type, func.count(Order.id))
        .where(
            Order.tenant_id == tenant_id,
            Order.created_at >= since,
        )
        .group_by(Order.order_type)
    )
    orders_by_source = {row[0]: int(row[1]) for row in orders_by_source_result.all()}

    average_order_value = revenue_total / completed_orders if completed_orders else 0

    return {
        "period_days": days,
        "revenue_total": revenue_total,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "average_order_value": average_order_value,
        "low_stock_count": low_stock_count,
        "tables_by_status": tables_by_status,
        "orders_by_status": orders_by_status,
        "orders_by_source": orders_by_source,
        "recent_orders": recent_orders_payload,
        "popular_items": popular_items,
    }
