from fastapi import APIRouter, Form, Response
from twilio.twiml.messaging_response import MessagingResponse
from langchain.memory import ConversationBufferMemory

from services.whatsapp_agent import WhatsAppRestaurantAgent

router = APIRouter(tags=["WhatsApp"])

# Global memory store for PoC (maps phone number to memory)
sessions = {}

# Initialize agent once
agent = WhatsAppRestaurantAgent()

@router.post("/whatsapp")
async def whatsapp_webhook(
    Body: str = Form(default=""),
    From: str = Form(...),
    Latitude: str | None = Form(default=None),
    Longitude: str | None = Form(default=None)
):
    print(f"\n--- New WhatsApp Message ---")
    print(f"From: {From}")
    print(f"User said: {Body}")
    if Latitude and Longitude:
        print(f"User Location: {Latitude}, {Longitude}")
    print(f"--------------------------\n")
    
    # Get or create memory for this phone number
    if From not in sessions:
        sessions[From] = ConversationBufferMemory(return_messages=True)
    
    memory = sessions[From]
    
    # Process with LangChain Agent
    ai_response = await agent.process_query(Body, From, memory, Latitude, Longitude)

    # Create a Twilio Response
    resp = MessagingResponse()
    resp.message(ai_response)

    return Response(content=str(resp), media_type="application/xml")
