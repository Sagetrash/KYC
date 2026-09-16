# noqa: EXE002
import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class Settings(BaseModel):
    API_V1_STR: str = "api/v1"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY","")
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

settings = Settings()