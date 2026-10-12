import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "app" / "ml" / "models"
DATA_DIR = BASE_DIR / "app" / "ml" / "data"
UPLOAD_DIR = BASE_DIR / "app" / "uploads"
DB_DIR = BASE_DIR / "app" / "db"

# Ensure directories exist
MODEL_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,*"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    DB_PATH: str = str(DB_DIR / "truthlens_history.db")

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()
