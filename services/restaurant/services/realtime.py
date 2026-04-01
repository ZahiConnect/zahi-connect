"""Simple tenant-scoped websocket broadcast manager for restaurant live screens."""

import asyncio
from collections import defaultdict

from fastapi import WebSocket


class RestaurantRealtimeManager:
    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, tenant_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[tenant_id].add(websocket)

    async def disconnect(self, tenant_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(tenant_id)
            if not sockets:
                return

            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(tenant_id, None)

    async def broadcast(self, tenant_id: str, payload: dict) -> None:
        async with self._lock:
            sockets = list(self._connections.get(tenant_id, set()))

        if not sockets:
            return

        stale_sockets = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                stale_sockets.append(socket)

        for socket in stale_sockets:
            await self.disconnect(tenant_id, socket)


restaurant_realtime = RestaurantRealtimeManager()


def build_restaurant_event(event_type: str, scopes: list[str], **metadata) -> dict:
    payload = {"type": event_type, "scopes": scopes}
    payload.update(metadata)
    return payload
