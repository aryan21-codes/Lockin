import time
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routes import youtube, ppt, todos, summarize, flashcards, code_explainer, dashboard, history, workflow, brain, exam_intelligence, sticky_notes
from app.routes import guest

# ─── Logging Configuration ─────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("lockin")

# ─── Rate Limiter (slowapi) ───────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ─── Lifespan (replaces deprecated on_event) ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    logger.info("🚀 Starting Lockin API v2.1...")

    # Pre-warm Supabase client
    try:
        from app.utils.database import warmup_client
        warmup_client()
        logger.info("✅ Supabase client pre-warmed")
    except Exception as e:
        logger.warning(f"⚠️ Supabase warmup failed: {e}")

    # Pre-warm JWKS cache
    try:
        from app.dependencies.auth import get_jwks
        get_jwks()
        logger.info("✅ JWKS cache pre-warmed")
    except Exception as e:
        logger.warning(f"⚠️ JWKS warmup failed: {e}")

    # Cleanup expired guest usage rows on startup
    try:
        from app.utils.database import cleanup_expired_guest_usage
        deleted = cleanup_expired_guest_usage(hours=48)
        logger.info(f"✅ Guest usage cleanup complete ({deleted} expired rows removed)")
    except Exception as e:
        logger.warning(f"⚠️ Guest usage cleanup failed: {e}")

    logger.info("🟢 Lockin API ready to serve requests")
    yield  # App runs here
    logger.info("🔴 Lockin API shutting down")


app = FastAPI(
    title="Student Productivity Hub API",
    description="Enterprise API with OpenAI and Supabase Integration",
    version="2.1.0",
    lifespan=lifespan,
)

# Attach limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
if not allowed_origins or allowed_origins == [""] or allowed_origins == ["*"]:
    allowed_origins = [
        "https://lockin-lovat.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Performance Monitoring Middleware ─────────────────────────
@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    """
    Logs response time for every request. Warns on slow requests (>2s).
    Helps identify bottlenecks in production.
    """
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    
    # Skip logging for health checks and static assets
    path = request.url.path
    if path not in ("/health", "/", "/favicon.ico"):
        level = logging.WARNING if duration_ms > 2000 else logging.INFO
        logger.log(level, f"{request.method} {path} → {response.status_code} [{duration_ms:.0f}ms]")
    
    # Add timing header for frontend debugging
    response.headers["X-Response-Time"] = f"{duration_ms:.0f}ms"
    return response

# ─── Route Registration ───────────────────────────────────────
app.include_router(guest.router)        # Guest auth (POST /auth/guest)
app.include_router(youtube.router)
app.include_router(ppt.router)
app.include_router(todos.router)
app.include_router(summarize.router)
app.include_router(flashcards.router)
app.include_router(code_explainer.router)
app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(workflow.router)
app.include_router(brain.router)
app.include_router(exam_intelligence.router)
app.include_router(sticky_notes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Student Productivity Hub API v2.1 (OpenAI Powered)"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ai_integration": "active"}
