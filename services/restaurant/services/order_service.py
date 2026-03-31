"""
Zahi Connect - Order Service
Business logic for order creation, status transitions, and total calculation.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.menu import MenuItem
from models.order import Order, OrderItem


class OrderService:

    @staticmethod
    async def create_order(
        db: AsyncSession,
        tenant_id: str,
        order_data: dict,
        items_data: list[dict],
    ) -> Order:
        """Create order with items and calculate total."""

        total = Decimal("0")
        order_items = []

        for item_data in items_data:
            unit_price = Decimal(str(item_data["unit_price"]))
            quantity = item_data["quantity"]
            total += unit_price * quantity

            order_item = OrderItem(
                menu_item_id=item_data["menu_item_id"],
                item_name=item_data["item_name"],
                quantity=quantity,
                unit_price=unit_price,
                special_instructions=item_data.get("special_instructions"),
            )
            order_items.append(order_item)

        order = Order(
            tenant_id=tenant_id,
            table_id=order_data.get("table_id"),
            order_type=order_data.get("order_type", "dine_in"),
            customer_name=order_data.get("customer_name"),
            customer_phone=order_data.get("customer_phone"),
            delivery_address=order_data.get("delivery_address"),
            special_instructions=order_data.get("special_instructions"),
            total_amount=total,
            status="new",
        )

        db.add(order)
        await db.flush()  # Get order.id

        for oi in order_items:
            oi.order_id = order.id
            db.add(oi)

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    def validate_status_transition(current: str, new: str) -> bool:
        """Validate order status transitions."""
        valid_transitions = {
            "new": ["preparing", "cancelled"],
            "preparing": ["ready", "cancelled"],
            "ready": ["completed", "cancelled"],
            "completed": [],
            "cancelled": [],
        }
        return new in valid_transitions.get(current, [])
