from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    OPENAI_API_KEY: str
    SUPABASE_JWT_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
