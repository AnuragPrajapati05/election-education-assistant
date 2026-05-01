# backend/main.py
"""
Election Education Assistant — FastAPI Backend
Handles AI chat, analytics, user management, and Cloud Function triggers.
"""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import time
import logging

load_dotenv(Path(__file__).with_name(".env"))

from routes.chat import router as chat_router
from routes.eligibility import router as eligibility_router
from routes.eligibility import analytics_router
from routes.eligibility import users_router
from routes.eligibility import booths_router
from middleware.auth import verify_firebase_token
from middleware.rate_limit import RateLimiter

# ─── App Setup ────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Election Education Assistant API",
    description="Backend API for ECI civic education platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── Middleware ───────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

rate_limiter = RateLimiter(requests_per_minute=60)

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{(time.time() - start):.3f}s"
    return response

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait."})
    return await call_next(request)

# ─── Routes ───────────────────────────────────────────────────────────────────

app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(eligibility_router, prefix="/api/eligibility", tags=["Eligibility"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(booths_router, prefix="/api/booths", tags=["Booth Locator"])

# ─── Health & Root ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"service": "Election Education Assistant API", "status": "operational", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}

# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})

@app.exception_handler(500)
async def server_error(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
