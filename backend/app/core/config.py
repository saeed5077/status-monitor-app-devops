from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://statuspage:statuspage@localhost:5432/statuspage"
    NEON_DATABASE_URL: str = ""
    USE_NEON_DB: bool = False
    REDIS_URL: str = "redis://localhost:6379"
    CLOUD_REDIS_URL: str = ""
    USE_CLOUD_REDIS: bool = False
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Email Settings
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "onboarding@resend.dev"
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
