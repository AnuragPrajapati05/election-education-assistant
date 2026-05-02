"""FastAPI application for the Election Education Assistant.

This module configures the FastAPI application, registers all routers,
applies security middleware (CORS, GZip, rate limiting, security headers),
and provides health/readiness endpoints.
"""

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

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_ALLOWED_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://vote-india-web-3tpn7dvrca-el.a.run.app",
    "https://vote-india-web-1057811226634.asia-south1.run.app",
)

# Content-Security-Policy restricts which resources the browser may load.
# This mitigates XSS, clickjacking, and data-injection attacks.
_CSP_DIRECTIVES = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://generativelanguage.googleapis.com https://firebaseapp.com https://*.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
])

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), payment=(), geolocation=(self)",
    "Content-Security-Policy": _CSP_DIRECTIVES,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_allowed_origins() -> list[str]:
    """Return the list of allowed CORS origins.

    Reads from the ``ALLOWED_ORIGINS`` environment variable (comma-separated).
    Falls back to :data:`DEFAULT_ALLOWED_ORIGINS` when the variable is unset
    or empty.

    Returns:
        list[str]: Allowed origin strings for the CORS middleware.
    """
    configured = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or list(DEFAULT_ALLOWED_ORIGINS)


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Election Education Assistant API",
    description=(
        "Backend API for a civic education platform focused on Indian election "
        "processes, voter registration, eligibility checks, and AI-powered guidance."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    contact={
        "name": "Vote India Support",
        "url": "https://vote-india-web-3tpn7dvrca-el.a.run.app",
    },
    license_info={
        "name": "MIT",
    },
)

# ---------------------------------------------------------------------------
# Middleware (order matters – added in reverse execution order)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Process-Time"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

rate_limiter = RateLimiter(
    requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Enforce per-IP sliding-window rate limiting.

    Returns HTTP 429 with a ``Retry-After`` header when a client exceeds
    the configured request quota.
    """
    identifier = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(identifier):
        remaining = rate_limiter.get_remaining(identifier)
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please wait before retrying."},
            headers={"Retry-After": "60", "X-RateLimit-Remaining": str(remaining)},
        )
    return await call_next(request)


@app.middleware("http")
async def add_response_headers(request: Request, call_next):
    """Attach security and performance headers to every HTTP response.

    Adds:
    - ``X-Process-Time``: request processing duration in seconds.
    - Security headers defined in :data:`SECURITY_HEADERS`.
    """
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{duration:.3f}s"
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(eligibility_router, prefix="/api/eligibility", tags=["Eligibility"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(booths_router, prefix="/api/booths", tags=["Booth Locator"])


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------


@app.get("/", summary="Service info", tags=["System"])
async def root() -> dict:
    """Return basic service metadata for liveness probes and discovery."""
    return {
        "service": "Election Education Assistant API",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/api/docs",
    }


@app.get("/api/health", summary="Health check", tags=["System"])
async def health() -> dict:
    """Lightweight health probe used by Cloud Run and load balancers.

    Returns:
        dict: ``{"status": "healthy", "timestamp": <unix epoch float>}``
    """
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/api/ready", summary="Readiness probe", tags=["System"])
async def ready() -> dict:
    """Readiness probe that confirms the application is ready to serve traffic.

    Returns:
        dict: Readiness status with service version info.
    """
    return {"ready": True, "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(404)
async def not_found_handler(_request: Request, _exc: Exception) -> JSONResponse:
    """Return a structured JSON 404 response instead of HTML."""
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


@app.exception_handler(405)
async def method_not_allowed_handler(_request: Request, _exc: Exception) -> JSONResponse:
    """Return a structured JSON 405 response for disallowed HTTP methods."""
    return JSONResponse(status_code=405, content={"detail": "Method not allowed"})


@app.exception_handler(500)
async def server_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Log and return a safe 500 response without leaking internal details."""
    logger.error("Unhandled server error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
        log_level="info",
        access_log=True,
    )
