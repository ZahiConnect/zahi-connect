from fastapi import APIRouter, Depends, Query

from dependencies import get_authorization_header, get_current_user
from schemas.chat import (
    ClearChatResponse,
    RestaurantChatHistoryResponse,
    RestaurantChatRequest,
    RestaurantChatResponse,
)
from services.chat_agent import RestaurantChatAgent
from services.dynamodb_service import clear_chat_history, get_chat_history, save_chat_message

router = APIRouter(prefix="/restaurant/chat", tags=["Restaurant AI Chat"])


def resolve_conversation_id(payload: dict, explicit_id: str | None) -> str:
    if explicit_id:
        return explicit_id
    return f"restaurant-web:{payload['tenant_id']}:{payload['user_id']}"


@router.get("/history", response_model=RestaurantChatHistoryResponse)
async def fetch_history(
    conversation_id: str | None = Query(default=None),
    payload: dict = Depends(get_current_user),
):
    resolved_id = resolve_conversation_id(payload, conversation_id)
    history = get_chat_history(resolved_id)
    return {"conversation_id": resolved_id, "messages": history}


@router.delete("/history", response_model=ClearChatResponse)
async def delete_history(
    conversation_id: str | None = Query(default=None),
    payload: dict = Depends(get_current_user),
):
    resolved_id = resolve_conversation_id(payload, conversation_id)
    deleted_count = clear_chat_history(resolved_id)
    return {"conversation_id": resolved_id, "deleted_count": deleted_count}


@router.post("/message", response_model=RestaurantChatResponse)
async def send_message(
    request: RestaurantChatRequest,
    authorization: str = Depends(get_authorization_header),
    payload: dict = Depends(get_current_user),
):
    resolved_id = resolve_conversation_id(payload, request.conversation_id)
    history = get_chat_history(resolved_id)

    agent = RestaurantChatAgent(
        authorization_header=authorization,
        user_payload=payload,
    )
    reply = await agent.process_query(request.message, history)

    user_message = save_chat_message(
        conversation_id=resolved_id,
        tenant_id=payload["tenant_id"],
        user_id=payload["user_id"],
        role="user",
        message=request.message,
        channel=request.channel,
    )
    assistant_message = save_chat_message(
        conversation_id=resolved_id,
        tenant_id=payload["tenant_id"],
        user_id=payload["user_id"],
        role="assistant",
        message=reply,
        channel=request.channel,
    )

    return {
        "conversation_id": resolved_id,
        "reply": reply,
        "messages": [message for message in [user_message, assistant_message] if message],
    }
