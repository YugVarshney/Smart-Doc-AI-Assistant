import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Doc AI Assistant"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/smartdoc"
    DATABASE_FALLBACK_SQLITE: bool = True
    SQLITE_URL: str = "sqlite:///./smartdoc.db"
    
    REDIS_URL: str = "redis://redis:6379/0"
    
    SECRET_KEY: str = "supersecretkeychangeinproduction1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    UPLOAD_DIR: str = "uploads"
    
    AZURE_OCR_ENDPOINT: Optional[str] = None
    AZURE_OCR_KEY: Optional[str] = None
    POPPLER_PATH: Optional[str] = None
    TESSERACT_CMD: Optional[str] = None
    
    LLM_BACKEND: str = "openai"  # "openai" | "stub"
    LLM_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None  # Alias for standard OpenAI API key
    OPENAI_BASE_URL: Optional[str] = None  # Optional: base URL for OpenAI-compatible APIs (e.g. Google AI Studio, OpenRouter)
    LLM_MODEL: str = "gpt-4o-mini"
    EMBEDDING_BACKEND: str = "local"  # "local" | "openai"
    EMBEDDING_DIM: int = 768  # Dimension of the vector embeddings
    EMBEDDING_MODEL: Optional[str] = None  # Optional: specific API embedding model name
    LOCAL_EMBEDDING_MODEL: str = "all-mpnet-base-v2"  # Local sentence-transformers model
    
    RERANK_ENABLED: bool = True
    RERANK_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    
    class Config:
        env_file = (
            ".env",
            os.path.join("..", ".env"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
        )
        env_file_encoding = 'utf-8'
        extra = "ignore"

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
