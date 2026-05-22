import time
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routes import youtube, ppt, todos, summarize, flashcards, code_explainer, dashboard, history, workflow, brain, exam_intelligence, sticky_notes

# ─── Logging Configuration ─────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("lockin")

app = FastAPI(
    title="Student Productivity Hub API",
    description="Enterprise API with OpenAI and Supabase Integration",
    version="2.0.0"
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

# ─── Startup Event ────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """
    Pre-warm expensive resources on startup to minimize cold-start
    latency on Render/Railway free tier.
    """
    logger.info("🚀 Starting Lockin API v2.0...")
    
    # Pre-warm Supabase client (avoid ~100ms on first request)
    try:
        from app.utils.database import warmup_client
        warmup_client()
        logger.info("✅ Supabase client pre-warmed")
    except Exception as e:
        logger.warning(f"⚠️ Supabase warmup failed: {e}")
    
    # Pre-warm JWKS cache (avoid ~200ms on first auth request)
    try:
        from app.dependencies.auth import get_jwks
        get_jwks()
        logger.info("✅ JWKS cache pre-warmed")
    except Exception as e:
        logger.warning(f"⚠️ JWKS warmup failed: {e}")
    
    logger.info("🟢 Lockin API ready to serve requests")

@app.get("/")
async def root():
    return {"message": "Welcome to Student Productivity Hub API v2.0 (OpenAI Powered)"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ai_integration": "active"}
