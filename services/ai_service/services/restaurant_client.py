import httpx

from config import settings


class RestaurantServiceError(RuntimeError):
    pass


class RestaurantServiceClient:
    def __init__(self, *, authorization_header: str):
        self.base_url = settings.RESTAURANT_SERVICE_URL.rstrip("/")
        self.authorization_header = authorization_header

    def _headers(self) -> dict:
        return {"Authorization": self.authorization_header}

    @staticmethod
    def _extract_error_detail(response: httpx.Response) -> str:
        try:
            data = response.json()
        except ValueError:
            return response.text or "Restaurant service request failed."

        if isinstance(data, dict):
            detail = data.get("detail")
            if isinstance(detail, str):
                return detail
        return "Restaurant service request failed."

    async def _get(self, path: str, *, params: dict | None = None):
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}{path}",
                params=params,
                headers=self._headers(),
            )
        if response.is_error:
            raise RestaurantServiceError(self._extract_error_detail(response))
        return response.json()

    async def _post(self, path: str, payload: dict):
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=self._headers(),
            )
        if response.is_error:
            raise RestaurantServiceError(self._extract_error_detail(response))
        return response.json()

    async def get_menu_categories(self):
        return await self._get("/rms/menu/categories")

    async def get_menu_items(self):
        return await self._get("/rms/menu/items")

    async def get_dashboard_summary(self, days: int = 7):
        return await self._get("/rms/reports/dashboard", params={"days": days})

    async def get_recent_orders(self, limit: int = 5):
        return await self._get("/rms/orders/", params={"limit": limit})

    async def get_low_stock_items(self):
        return await self._get("/rms/inventory/low-stock")

    async def create_order(self, payload: dict):
        return await self._post("/rms/orders/", payload)
