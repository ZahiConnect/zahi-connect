"""Business logic for restaurant orders and table coordination."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.menu import MenuItem
from models.order import Order, OrderItem
from models.table import Table


ACTIVE_ORDER_STATUSES = {"new", "preparing", "ready"}
DELIVERY_LIKE_ORDER_TYPES = {"delivery", "whatsapp", "website"}


class OrderService:
    @staticmethod
    def validate_status_transition(current: str, new: str) -> bool:
        valid_transitions = {
            "new": {"preparing", "cancelled"},
            "preparing": {"ready", "cancelled"},
            "ready": {"completed", "cancelled"},
            "completed": set(),
            "cancelled": set(),
        }
        return new in valid_transitions.get(current, set())

    @staticmethod
    async def create_order(
        db: AsyncSession,
        tenant_id: str,
        order_data: dict,
        items_data: list[dict],
    ) -> Order:
        order_type = order_data.get("order_type", "dine_in")
        table = await OrderService._validate_table_for_order(
            db=db,
            tenant_id=tenant_id,
            table_id=order_data.get("table_id"),
            order_type=order_type,
        )
        menu_items = await OrderService._load_menu_items(
            db=db,
            tenant_id=tenant_id,
            item_ids=[item["menu_item_id"] for item in items_data],
        )

        total = Decimal("0")
        order_items = []

        for item_data in items_data:
            menu_item = menu_items[item_data["menu_item_id"]]
            if not menu_item.is_available:
                raise HTTPException(
                    status_code=400,
                    detail=f"'{menu_item.name}' is currently unavailable",
                )

            unit_price = OrderService._resolve_menu_price(menu_item, order_type)
            quantity = item_data["quantity"]
            total += unit_price * quantity

            order_items.append(
                OrderItem(
                    menu_item_id=menu_item.id,
                    item_name=menu_item.name,
                    quantity=quantity,
                    unit_price=unit_price,
                    special_instructions=item_data.get("special_instructions"),
                )
            )

        order = Order(
            tenant_id=tenant_id,
            table_id=table.id if table else None,
            order_type=order_type,
            customer_name=order_data.get("customer_name"),
            customer_phone=order_data.get("customer_phone"),
            delivery_address=order_data.get("delivery_address"),
            special_instructions=order_data.get("special_instructions"),
            total_amount=total,
            status="new",
        )

        db.add(order)
        await db.flush()

        for order_item in order_items:
            order_item.order_id = order.id
            db.add(order_item)

        if table:
            table.status = "occupied"

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def apply_status_update(db: AsyncSession, order: Order, new_status: str) -> Order:
        order.status = new_status

        if order.table_id and new_status in {"completed", "cancelled"}:
            await OrderService._release_table_if_last_active_order(
                db=db,
                tenant_id=order.tenant_id,
                table_id=order.table_id,
                excluding_order_id=order.id,
            )

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def _load_menu_items(
        db: AsyncSession, tenant_id: str, item_ids: list
    ) -> dict:
        unique_ids = list(dict.fromkeys(item_ids))
        result = await db.execute(
            select(MenuItem).where(
                MenuItem.tenant_id == tenant_id,
                MenuItem.id.in_(unique_ids),
            )
        )
        items = {item.id: item for item in result.scalars().all()}

        missing_ids = [str(item_id) for item_id in unique_ids if item_id not in items]
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Menu items not found: {', '.join(missing_ids)}",
            )

        return items

    @staticmethod
    async def _validate_table_for_order(
        db: AsyncSession,
        tenant_id: str,
        table_id,
        order_type: str,
    ) -> Table | None:
        if not table_id:
            return None

        result = await db.execute(
            select(Table).where(Table.id == table_id, Table.tenant_id == tenant_id)
        )
        table = result.scalar_one_or_none()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        if order_type == "dine_in":
            active_order_result = await db.execute(
                select(func.count(Order.id)).where(
                    Order.tenant_id == tenant_id,
                    Order.table_id == table_id,
                    Order.status.in_(ACTIVE_ORDER_STATUSES),
                )
            )
            if active_order_result.scalar_one() > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Table {table.table_number} already has an active order",
                )

        return table

    @staticmethod
    async def _release_table_if_last_active_order(
        db: AsyncSession,
        tenant_id: str,
        table_id,
        excluding_order_id,
    ) -> None:
        result = await db.execute(
            select(func.count(Order.id)).where(
                Order.tenant_id == tenant_id,
                Order.table_id == table_id,
                Order.id != excluding_order_id,
                Order.status.in_(ACTIVE_ORDER_STATUSES),
            )
        )
        remaining_active_orders = result.scalar_one()
        if remaining_active_orders > 0:
            return

        table_result = await db.execute(
            select(Table).where(Table.id == table_id, Table.tenant_id == tenant_id)
        )
        table = table_result.scalar_one_or_none()
        if table:
            table.status = "available"

    @staticmethod
    def _resolve_menu_price(menu_item: MenuItem, order_type: str) -> Decimal:
        if order_type in DELIVERY_LIKE_ORDER_TYPES and menu_item.delivery_price is not None:
            return Decimal(str(menu_item.delivery_price))
        return Decimal(str(menu_item.dine_in_price))
