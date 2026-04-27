"""Keep customer booking activity aligned with restaurant order movement."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from models.order import Order


CUSTOMER_STATUS_BY_ORDER_STATUS = {
    "new": "sent_to_kitchen",
    "preparing": "preparing",
    "ready": "ready_for_delivery",
    "out_for_delivery": "out_for_delivery",
    "served": "delivered",
    "completed": "completed",
    "cancelled": "cancelled",
}


def customer_status_for_order(order_status: str | None) -> str:
    return CUSTOMER_STATUS_BY_ORDER_STATUS.get(order_status or "", "sent_to_kitchen")


async def sync_customer_booking_for_order(db: AsyncSession, order: Order) -> None:
    customer_status = customer_status_for_order(order.status)
    await db.execute(
        text(
            """
            UPDATE booking_requests
            SET
                status = CAST(:booking_status AS VARCHAR),
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                    'restaurant_order',
                    COALESCE(metadata->'restaurant_order', '{}'::jsonb) || jsonb_build_object(
                        'order_id', CAST(:metadata_order_id AS TEXT),
                        'status', CAST(:metadata_order_status AS TEXT),
                        'customer_status', CAST(:metadata_customer_status AS TEXT),
                        'service_assignee', CAST(:metadata_service_assignee AS TEXT),
                        'bill_number', CAST(:metadata_bill_number AS TEXT),
                        'updated_at', NOW()
                    )
                ),
                updated_at = NOW()
            WHERE service_type = 'restaurant'
              AND metadata->'restaurant_order'->>'order_id' = CAST(:lookup_order_id AS TEXT)
            """
        ),
        {
            "booking_status": customer_status,
            "metadata_order_id": str(order.id),
            "metadata_order_status": order.status,
            "metadata_customer_status": customer_status,
            "metadata_service_assignee": order.service_assignee,
            "metadata_bill_number": order.bill_number,
            "lookup_order_id": str(order.id),
        },
    )
    await db.commit()
