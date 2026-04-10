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
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_origin_regex=(
        r"^https?://"
        r"(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::(?:3000|5173|5174|8080))?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurant_chat_router, prefix="/ai")


@app.get("/ai")
def health_check():
    return {"status": "ok", "service": "Zahi Connect - AI Service"}
