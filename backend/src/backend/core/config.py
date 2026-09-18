# noqa: EXE002
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "KYC BACKEND"
    API_V1_STR: str = "api/v1"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY","")
    OCR_MODEL_NAME: str = os.getenv("OCR_MODEL_NAME", "gemini-3.1-flash-lite")
    ASSETS_DIR = Path(__file__).parent.parent / "assets"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

settings = Settings()