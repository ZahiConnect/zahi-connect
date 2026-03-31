"""
Zahi Connect - Reports Router
Revenue, order stats, and popular items.
"""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_tenant_id
from models.order import Order, OrderItem

router = APIRouter(tags=["Reports"])


@router.get("/summary")
async def get_daily_summary(
    report_date: date | None = Query(None, description="Date in YYYY-MM-DD format"),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    """
    Dashboard summary: today's revenue, order counts by status, order source breakdown.
    """
    if not report_date:
        report_date = date.today()

    start = datetime.combine(report_date, datetime.min.time())
    end = start + timedelta(days=1)

    # Total revenue (completed orders only)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.tenant_id == tenant_id,
            Order.status == "completed",
            Order.created_at >= start,
            Order.created_at < end,
        )
    )
    total_revenue = float(revenue_result.scalar())

    # Order counts by status
    status_result = await db.execute(
        select(Order.status, func.count(Order.id)).where(
            Order.tenant_id == tenant_id,
            Order.created_at >= start,
            Order.created_at < end,
        ).group_by(Order.status)
    )
    status_counts = {row[0]: row[1] for row in status_result.all()}

    # Order source breakdown
    source_result = await db.execute(
        select(Order.order_type, func.count(Order.id)).where(
            Order.tenant_id == tenant_id,
            Order.created_at >= start,
            Order.created_at < end,
        ).group_by(Order.order_type)
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
    """Top-selling menu items over the last N days."""
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
            "total_revenue": float(row[2]),
        }
        for row in result.all()
    ]
