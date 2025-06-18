from typing import List
from pydantic_settings import BaseSettings
import os
from pathlib import Path

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Wav2Lip Full Stack"
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "sqlite:///./wav2lip.db"
    
    # File Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE: int = 100_000_000  # 100MB
    
    # Model Settings
    MODEL_CHECKPOINT_DIR: str = str(BASE_DIR / "checkpoints")
    GAN_MODEL_PATH: str = str(Path(MODEL_CHECKPOINT_DIR) / "wav2lip_gan.pth")
    STANDARD_MODEL_PATH: str = str(Path(MODEL_CHECKPOINT_DIR) / "wav2lip.pth")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Create necessary directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.MODEL_CHECKPOINT_DIR, exist_ok=True) 