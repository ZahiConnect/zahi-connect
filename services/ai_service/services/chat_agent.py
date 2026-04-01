import difflib
import re
from collections import defaultdict

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import StructuredTool
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from config import settings
from services.restaurant_client import RestaurantServiceClient, RestaurantServiceError
from services.restaurant_vectorstore import RestaurantVectorStore


class MenuOverviewInput(BaseModel):
    category_filter: str | None = Field(
        default=None,
        description="Optional category name to narrow the menu, like starters, drinks, or mandi.",
    )
    food_type: str | None = Field(
        default=None,
        description="Optional food type filter. Use veg or non_veg when the user asks.",
    )
    available_only: bool = Field(
        default=True,
        description="Keep this true unless the user explicitly asks about unavailable items.",
    )
    limit_per_category: int = Field(default=6, ge=1, le=12)


class SearchMenuInput(BaseModel):
    query: str = Field(description="The food item, cuisine, or phrase the user wants to find.")
    available_only: bool = Field(default=True)
    max_results: int = Field(default=6, ge=1, le=10)


class KnowledgeSearchInput(BaseModel):
    query: str = Field(
        description="Semantic search query for menu knowledge, restaurant descriptions, or natural-language item discovery."
    )
    limit: int = Field(default=4, ge=1, le=8)


class RequestedOrderItem(BaseModel):
    name: str = Field(description="The menu item name from the user's request.")
    quantity: int = Field(default=1, ge=1, le=20)
    special_instructions: str | None = Field(
        default=None,
        description="Optional line-item instruction such as less spicy or extra gravy.",
    )


class PlaceOrderInput(BaseModel):
    items: list[RequestedOrderItem] = Field(..., min_length=1, max_length=8)
    order_type: str = Field(
        default="website",
        pattern=r"^(website|delivery|whatsapp)$",
        description="Use website for normal web chat orders. Use delivery only when the user clearly asks for delivery.",
    )
    customer_name: str | None = Field(default=None)
    customer_phone: str | None = Field(default=None)
    delivery_address: str | None = Field(default=None)
    special_instructions: str | None = Field(default=None)


class DashboardSummaryInput(BaseModel):
    days: int = Field(default=7, ge=1, le=30)


class RecentOrdersInput(BaseModel):
    limit: int = Field(default=5, ge=1, le=10)


class LowStockInput(BaseModel):
    limit: int = Field(default=5, ge=1, le=10)


class RestaurantChatAgent:
    def __init__(self, *, authorization_header: str, user_payload: dict):
        self.authorization_header = authorization_header
        self.user_payload = user_payload
        self.user_name = user_payload.get("username") or "Owner"
        self.tenant_id = str(user_payload.get("tenant_id"))
        self.groq_key = settings.GROQ_API_KEY
        self.restaurant_client = RestaurantServiceClient(
            authorization_header=authorization_header
        )
        self._menu_cache = None
        self._category_name_map = {}
        self.vectorstore = None
        try:
            self.vectorstore = RestaurantVectorStore(
                tenant_id=self.tenant_id,
                api_key=settings.all_gemini_keys()[0],
            )
        except Exception as exc:
            print(f"[VECTORSTORE INIT ERROR] {exc}")

        self.models_chain = (
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "mixtral-8x7b-32768",
        )
        self.llm = self._initialize_llm_with_fallbacks()
        self.agent_executor = self._create_agent()

    def _initialize_llm_with_fallbacks(self):
        llms = [
            ChatGroq(
                model=model,
                groq_api_key=self.groq_key,
                temperature=0.2,
            )
            for model in self.models_chain
        ]
        primary_llm, *fallbacks = llms
        return primary_llm.with_fallbacks(fallbacks, exceptions_to_handle=(Exception,))

    async def _load_menu_catalog(self):
        if self._menu_cache is not None:
            return self._menu_cache

        categories = await self.restaurant_client.get_menu_categories()
        items = await self.restaurant_client.get_menu_items()
        self._category_name_map = {
            category["id"]: category["name"]
            for category in categories
            if category.get("is_active", True)
        }

        for item in items:
            item["category_name"] = self._category_name_map.get(
                item.get("category_id"),
                "Uncategorized",
            )

        self._menu_cache = items
        if self.vectorstore is not None:
            try:
                self.vectorstore.sync_menu_items(items)
            except Exception as exc:
                print(f"[VECTORSTORE SYNC ERROR] {exc}")
        return items

    @staticmethod
    def _normalize_text(value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
        return " ".join(normalized.split())

    def _find_menu_matches(self, query: str, items: list[dict]) -> list[dict]:
        normalized_query = self._normalize_text(query)
        if not normalized_query:
            return []

        exact_matches = [
            item
            for item in items
            if self._normalize_text(item.get("name", "")) == normalized_query
        ]
        if exact_matches:
            return exact_matches

        contains_matches = [
            item
            for item in items
            if normalized_query in self._normalize_text(item.get("name", ""))
        ]
        if contains_matches:
            return contains_matches

        menu_names = {
            self._normalize_text(item.get("name", "")): item
            for item in items
        }
        close_keys = difflib.get_close_matches(
            normalized_query,
            list(menu_names.keys()),
            n=4,
            cutoff=0.55,
        )
        return [menu_names[key] for key in close_keys]

    @staticmethod
    def _format_price(item: dict, *, order_type: str = "website") -> str:
        if order_type in {"delivery", "website", "whatsapp"} and item.get("delivery_price") is not None:
            return f"Rs {float(item['delivery_price']):.2f}"
        return f"Rs {float(item['dine_in_price']):.2f}"

    async def _menu_overview_tool_logic(
        self,
        category_filter: str | None = None,
        food_type: str | None = None,
        available_only: bool = True,
        limit_per_category: int = 6,
    ) -> str:
        try:
            items = await self._load_menu_catalog()
            filtered_items = items

            if available_only:
                filtered_items = [item for item in filtered_items if item.get("is_available")]
            if food_type:
                filtered_items = [
                    item for item in filtered_items if item.get("food_type") == food_type
                ]
            if category_filter:
                normalized_filter = self._normalize_text(category_filter)
                filtered_items = [
                    item
                    for item in filtered_items
                    if normalized_filter in self._normalize_text(item.get("category_name", ""))
                    or normalized_filter in self._normalize_text(item.get("name", ""))
                ]

            if not filtered_items:
                return "No menu items matched that filter right now."

            grouped_items = defaultdict(list)
            for item in filtered_items:
                grouped_items[item.get("category_name", "Uncategorized")].append(item)

            lines = []
            for category_name in sorted(grouped_items.keys()):
                lines.append(f"{category_name}:")
                for item in grouped_items[category_name][:limit_per_category]:
                    availability = "" if item.get("is_available") else " (currently unavailable)"
                    lines.append(
                        f"- {item['name']} | {self._format_price(item)} | {item['food_type']}{availability}"
                    )
                    if item.get("description"):
                        lines.append(f"  {item['description']}")

            return "\n".join(lines[:40])
        except RestaurantServiceError as exc:
            return f"I could not load the live menu right now: {exc}"

    async def _search_menu_tool_logic(
        self,
        query: str,
        available_only: bool = True,
        max_results: int = 6,
    ) -> str:
        try:
            items = await self._load_menu_catalog()
            if available_only:
                items = [item for item in items if item.get("is_available")]

            matches = self._find_menu_matches(query, items)
            if not matches:
                return f"I could not find any menu item matching '{query}'."

            lines = []
            for item in matches[:max_results]:
                lines.append(
                    f"- {item['name']} | {item.get('category_name', 'Uncategorized')} | "
                    f"{self._format_price(item)} | {item['food_type']}"
                )
                if item.get("description"):
                    lines.append(f"  {item['description']}")

            return "\n".join(lines)
        except RestaurantServiceError as exc:
            return f"I could not search the menu right now: {exc}"

    async def _knowledge_search_tool_logic(self, query: str, limit: int = 4) -> str:
        try:
            await self._load_menu_catalog()
            if self.vectorstore is None:
                return "The restaurant knowledge index is not ready right now."
            documents = self.vectorstore.search(query, limit=limit)
            if not documents:
                return f"I could not find relevant restaurant knowledge for '{query}'."

            lines = []
            for document in documents:
                lines.append(document.page_content)
            return "\n\n".join(lines)
        except Exception as exc:
            return f"I could not search the restaurant knowledge base right now: {exc}"

    async def _place_order_tool_logic(
        self,
        items: list[RequestedOrderItem],
        order_type: str = "website",
        customer_name: str | None = None,
        customer_phone: str | None = None,
        delivery_address: str | None = None,
        special_instructions: str | None = None,
    ) -> str:
        try:
            menu_items = await self._load_menu_catalog()
            available_items = [item for item in menu_items if item.get("is_available")]
            payload_items = []

            for requested_item in items:
                matches = self._find_menu_matches(requested_item.name, available_items)

                if not matches:
                    return f"I could not find a menu item called '{requested_item.name}'."
                if len(matches) > 1:
                    options = ", ".join(match["name"] for match in matches[:4])
                    return (
                        f"'{requested_item.name}' matches multiple items: {options}. "
                        "Ask the user which one they want before creating the order."
                    )

                matched_item = matches[0]
                payload_items.append(
                    {
                        "menu_item_id": matched_item["id"],
                        "quantity": requested_item.quantity,
                        "special_instructions": requested_item.special_instructions,
                    }
                )

            if order_type == "delivery" and not delivery_address:
                return "A delivery order needs a delivery address before I can create it."

            payload = {
                "order_type": order_type,
                "customer_name": customer_name or self.user_name,
                "customer_phone": customer_phone,
                "delivery_address": delivery_address,
                "special_instructions": special_instructions,
                "items": payload_items,
            }
            order = await self.restaurant_client.create_order(payload)

            line_items = ", ".join(
                f"{item['quantity']} x {item['item_name']}"
                for item in order.get("items", [])
            )
            return (
                f"Created {order_type} order #{str(order['id'])[:8]} for {line_items}. "
                f"Total: Rs {float(order['total_amount']):.2f}. "
                f"Status: {order['status']}."
            )
        except RestaurantServiceError as exc:
            return f"I could not create the order: {exc}"

    async def _dashboard_summary_tool_logic(self, days: int = 7) -> str:
        try:
            summary = await self.restaurant_client.get_dashboard_summary(days)
            popular_items = summary.get("popular_items", [])
            top_item = popular_items[0]["item_name"] if popular_items else "No completed sales yet"
            return (
                f"Last {days} days summary:\n"
                f"- Revenue: Rs {float(summary.get('revenue_total', 0)):.2f}\n"
                f"- Active orders: {summary.get('active_orders', 0)}\n"
                f"- Completed orders: {summary.get('completed_orders', 0)}\n"
                f"- Low stock alerts: {summary.get('low_stock_count', 0)}\n"
                f"- Top item: {top_item}"
            )
        except RestaurantServiceError as exc:
            return f"I could not load the dashboard summary: {exc}"

    async def _recent_orders_tool_logic(self, limit: int = 5) -> str:
        try:
            orders = await self.restaurant_client.get_recent_orders(limit)
            if not orders:
                return "There are no recent orders yet."

            lines = []
            for order in orders[:limit]:
                customer = (
                    order.get("customer_name")
                    or (f"Table {order['table_number']}" if order.get("table_number") else None)
                    or "Guest"
                )
                lines.append(
                    f"- #{str(order['id'])[:8]} | {customer} | {order['status']} | "
                    f"Rs {float(order['total_amount']):.2f}"
                )
            return "\n".join(lines)
        except RestaurantServiceError as exc:
            return f"I could not load recent orders: {exc}"

    async def _low_stock_tool_logic(self, limit: int = 5) -> str:
        try:
            items = await self.restaurant_client.get_low_stock_items()
            if not items:
                return "There are no low-stock alerts right now."

            lines = []
            for item in items[:limit]:
                lines.append(
                    f"- {item['name']} | qty {float(item['quantity']):.2f} | threshold {float(item['low_stock_threshold']):.2f}"
                )
            return "\n".join(lines)
        except RestaurantServiceError as exc:
            return f"I could not load low-stock alerts: {exc}"

    def _create_agent(self):
        tools = [
            StructuredTool.from_function(
                coroutine=self._menu_overview_tool_logic,
                name="get_menu_overview",
                description="Use this to show the live menu, grouped by category, when the user asks for the menu or available dishes.",
                args_schema=MenuOverviewInput,
            ),
            StructuredTool.from_function(
                coroutine=self._search_menu_tool_logic,
                name="search_menu_items",
                description="Use this to find live menu items, prices, or availability for a specific dish or cuisine.",
                args_schema=SearchMenuInput,
            ),
            StructuredTool.from_function(
                coroutine=self._knowledge_search_tool_logic,
                name="search_restaurant_knowledge",
                description="Use this for semantic restaurant knowledge search when the user asks naturally about dishes, what is available, or wants context from descriptions rather than exact item names.",
                args_schema=KnowledgeSearchInput,
            ),
            StructuredTool.from_function(
                coroutine=self._place_order_tool_logic,
                name="create_website_order",
                description="Use this when the user wants to order food, book food, reserve dishes, or place a restaurant order from chat.",
                args_schema=PlaceOrderInput,
            ),
            StructuredTool.from_function(
                coroutine=self._dashboard_summary_tool_logic,
                name="get_dashboard_summary",
                description="Use this for owner-style questions about revenue, active orders, completed orders, and top items.",
                args_schema=DashboardSummaryInput,
            ),
            StructuredTool.from_function(
                coroutine=self._recent_orders_tool_logic,
                name="get_recent_orders",
                description="Use this when the user asks about the latest orders or current order board.",
                args_schema=RecentOrdersInput,
            ),
            StructuredTool.from_function(
                coroutine=self._low_stock_tool_logic,
                name="get_low_stock_items",
                description="Use this for inventory alert questions such as low stock or ingredients running out.",
                args_schema=LowStockInput,
            ),
        ]

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """You are Zahi Connect's restaurant AI assistant inside the web workspace.

Your job:
- help users browse the live restaurant menu
- create website orders from chat
- answer quick restaurant operations questions with live data

Rules:
1. Always use tools for menu, pricing, availability, orders, dashboard, stock, or restaurant knowledge questions.
2. Never invent menu items, prices, totals, or order IDs.
3. If a user says "book" for food, treat that as placing an order.
4. If something is ambiguous, ask one short follow-up question instead of guessing.
5. Keep answers concise, practical, and friendly, usually 2 to 6 lines.
6. Use Rs for money.
7. If the question is outside restaurant scope, say this assistant currently handles restaurant workflows only.""",
                ),
                (
                    "human",
                    "Current user: {user_name}\nTenant ID: {tenant_id}\n"
                    "Conversation so far:\n{chat_history}\n\nLatest user message: {input}",
                ),
                ("placeholder", "{agent_scratchpad}"),
            ]
        )

        agent = create_tool_calling_agent(self.llm, tools, prompt)
        return AgentExecutor(agent=agent, tools=tools, verbose=True)

    @staticmethod
    def _format_history(history: list[dict]) -> str:
        if not history:
            return "No previous messages."

        lines = []
        for entry in history[-12:]:
            role = entry.get("role", "assistant").capitalize()
            message = entry.get("message", "").strip()
            if message:
                lines.append(f"{role}: {message}")
        return "\n".join(lines) if lines else "No previous messages."

    async def process_query(self, user_query: str, history: list[dict]) -> str:
        try:
            response = await self.agent_executor.ainvoke(
                {
                    "input": user_query,
                    "chat_history": self._format_history(history),
                    "user_name": self.user_name,
                    "tenant_id": self.tenant_id,
                }
            )
            return str(response["output"]).strip()
        except Exception as exc:
            print(f"[AI SERVICE ERROR] {exc}")
            return "I'm having trouble reaching the live restaurant systems right now. Please try again in a moment."
