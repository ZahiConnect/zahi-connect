from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.chat import router as restaurant_chat_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/ai/docs",
    openapi_url="/ai/openapi.json",
    redoc_url="/ai/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurant_chat_router, prefix="/ai")


@app.get("/ai")
def health_check():
    return {"status": "ok", "service": "Zahi Connect - AI Service"}
