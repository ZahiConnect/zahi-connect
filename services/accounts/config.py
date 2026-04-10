import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Zahi Connect - Accounts Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # Token Lifetimes (in minutes / days)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1000"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Cookie Settings (mirrors MyCalo's SIMPLE_JWT config)
    AUTH_COOKIE: str = "refresh_token"
    AUTH_COOKIE_CUSTOMER: str = os.getenv("AUTH_COOKIE_CUSTOMER", "refresh_token_customer")
    AUTH_COOKIE_WORKSPACE: str = os.getenv("AUTH_COOKIE_WORKSPACE", "refresh_token_workspace")
    AUTH_COOKIE_SECURE: bool = os.getenv("AUTH_COOKIE_SECURE", "True").lower() == "true"
    AUTH_COOKIE_HTTP_ONLY: bool = True
    AUTH_COOKIE_SAMESITE: str = os.getenv("AUTH_COOKIE_SAMESITE", "None")

    # Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_NAME: str = os.getenv("DB_NAME", "zahi_connect_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")

    # Email (SMTP)
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_HOST_USER: str = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD: str = os.getenv("EMAIL_HOST_PASSWORD", "")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

    # Payments
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    FRONTEND_APP_URL: str = os.getenv("FRONTEND_APP_URL", "http://localhost:5173")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    def validate(self):
        if not self.SECRET_KEY:
            raise ValueError(
                "SECRET_KEY not found. Please set it in .env"
            )
        if not self.DB_PASSWORD:
            print("Warning: DB_PASSWORD not set. Database operations will fail.")
        if not self.EMAIL_HOST_USER:
            print("Warning: EMAIL_HOST_USER not set. Emails will print to console.")
        if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_SECRET:
            print("Warning: Razorpay keys not set. Subscription checkout will fail.")


settings = Settings()
settings.validate()
