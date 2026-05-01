"""FastAPI application for the Election Education Assistant."""

import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

load_dotenv(Path(__file__).with_name(".env"))

from middleware.rate_limit import RateLimiter
from routes.chat import router as chat_router
from routes.eligibility import analytics_router, booths_router, router as eligibility_router, users_router

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://vote-india-web-1057811226634.asia-south1.run.app",
)

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), payment=()",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def get_allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or list(DEFAULT_ALLOWED_ORIGINS)


app = FastAPI(
    title="Election Education Assistant API",
    description="Backend API for a civic education platform focused on Indian election processes.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

rate_limiter = RateLimiter(requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")))


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    identifier = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(identifier):
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait."})
    return await call_next(request)


@app.middleware("http")
async def add_response_headers(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{(time.perf_counter() - start):.3f}s"
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(eligibility_router, prefix="/api/eligibility", tags=["Eligibility"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(booths_router, prefix="/api/booths", tags=["Booth Locator"])


@app.get("/")
async def root():
    return {"service": "Election Education Assistant API", "status": "operational", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}


@app.exception_handler(404)
async def not_found(_request: Request, _exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


@app.exception_handler(500)
async def server_error(_request: Request, exc):
    logger.error("Internal server error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
