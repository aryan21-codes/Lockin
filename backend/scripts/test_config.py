print("Importing pydantic_settings...")
import time
t0 = time.time()
from pydantic_settings import BaseSettings
print(f"pydantic_settings loaded in {time.time()-t0:.3f}s")

print("Importing dotenv...")
t0 = time.time()
from dotenv import load_dotenv
print(f"dotenv loaded in {time.time()-t0:.3f}s")

print("Running load_dotenv...")
t0 = time.time()
load_dotenv()
print(f"load_dotenv completed in {time.time()-t0:.3f}s")

print("Defining Settings class...")
t0 = time.time()
class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    OPENAI_API_KEY: str
    SUPABASE_JWT_SECRET: str = None
    GUEST_JWT_SECRET: str = "lockin-guest-dev-secret-change-in-prod"

    class Config:
        env_file = ".env"
        extra = "ignore"
print(f"Class defined in {time.time()-t0:.3f}s")

print("Instantiating Settings...")
t0 = time.time()
try:
    settings = Settings()
    print(f"Instantiated successfully in {time.time()-t0:.3f}s")
except Exception as e:
    print(f"Failed to instantiate: {e}")
