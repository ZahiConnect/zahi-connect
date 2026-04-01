import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Zahi Connect - AI Service"
    VERSION: str = "1.0.0"

    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    BACKUP_GEMINI_KEY: str = os.getenv("BACKUP_GEMINI_KEY", "")
    BACKUP_GEMINI_KEYS2: str = os.getenv("BACKUP_GEMINI_KEYS2", "")

    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    DYNAMODB_ENDPOINT: str = os.getenv("DYNAMODB_ENDPOINT", "")
    DYNAMODB_TABLE_NAME: str = os.getenv("DYNAMODB_TABLE_NAME", "ZahiChatHistory")

    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "chromadb")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8000"))

    RESTAURANT_SERVICE_URL: str = os.getenv("RESTAURANT_SERVICE_URL", "http://restaurant:8003")

    def all_gemini_keys(self) -> list[str]:
        keys = [
            self.GEMINI_API_KEY,
            self.BACKUP_GEMINI_KEY,
            *self.BACKUP_GEMINI_KEYS2.split(","),
        ]
        deduped = []
        for key in keys:
            clean_key = key.strip()
            if clean_key and clean_key not in deduped:
                deduped.append(clean_key)
        return deduped

    def validate(self):
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY not found. Please set it in .env")
        if not self.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required for the chat model.")
        if not self.all_gemini_keys():
            raise ValueError("At least one Gemini API key is required for embeddings.")
        if not self.AWS_ACCESS_KEY_ID or not self.AWS_SECRET_ACCESS_KEY:
            print("Warning: AWS credentials not set. DynamoDB chat history may not work.")


settings = Settings()
settings.validate()
