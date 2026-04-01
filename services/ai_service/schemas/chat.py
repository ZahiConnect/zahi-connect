from typing import Literal

from pydantic import BaseModel, Field


class ChatHistoryMessage(BaseModel):
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    message: str
    timestamp: str
    channel: str = "web"


class RestaurantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = Field(default=None, max_length=160)
    channel: Literal["web"] = "web"


class RestaurantChatHistoryResponse(BaseModel):
    conversation_id: str
    messages: list[ChatHistoryMessage] = Field(default_factory=list)


class RestaurantChatResponse(BaseModel):
    conversation_id: str
    reply: str
    messages: list[ChatHistoryMessage] = Field(default_factory=list)


class ClearChatResponse(BaseModel):
    conversation_id: str
    deleted_count: int = 0
