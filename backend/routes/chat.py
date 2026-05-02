"""AI chat routes with Gemini proxying, lightweight caching, and starter prompts.

This module exposes two endpoints:
- ``POST /api/chat/``       – send a message and receive an AI-generated response.
- ``GET  /api/chat/suggestions`` – return starter question suggestions by language.

Responses are cached in-process for :data:`CACHE_TTL` seconds to reduce
Gemini API usage for repeated identical questions.
"""

import hashlib
import logging
import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)
router = APIRouter()

GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL: str = "gemini-2.0-flash"
GEMINI_URL: str = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

# ---------------------------------------------------------------------------
# In-memory response cache
# ---------------------------------------------------------------------------

_cache: dict[str, dict[str, float | str]] = {}
CACHE_TTL: int = 300  # seconds


def cache_get(key: str) -> Optional[str]:
    """Return the cached value for *key* if it exists and has not expired.

    Args:
        key: Cache key (SHA-256 hex digest of the request fingerprint).

    Returns:
        The cached response string, or ``None`` if the entry is missing or stale.
    """
    entry = _cache.get(key)
    if entry and time.time() - float(entry["ts"]) < CACHE_TTL:
        return str(entry["value"])
    return None


def cache_set(key: str, value: str) -> None:
    """Store *value* under *key* in the in-memory cache.

    Evicts the oldest 100 entries when the cache exceeds 500 items to bound
    memory usage.

    Args:
        key:   Cache key.
        value: Response string to cache.
    """
    _cache[key] = {"value": value, "ts": time.time()}
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda item: item[1]["ts"])[:100]
        for cache_key, _ in oldest:
            _cache.pop(cache_key, None)


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are the Election Process Education Assistant for India, a knowledgeable "
        "and friendly civic educator.\n"
        "Your role is to help citizens understand voter registration, eligibility, "
        "election schedules, EVMs, polling booths, NOTA, voter rights, and Election "
        "Commission of India procedures.\n\n"
        "Rules:\n"
        "- Keep responses concise and helpful.\n"
        "- Use simple, accessible language.\n"
        "- Stay politically neutral.\n"
        "- Give step-by-step guidance when useful.\n"
        "- Redirect non-election topics politely.\n"
        "- End factual claims with: \"For official info, visit voters.eci.gov.in\"\n"
    ),
    "hi": (
        "Aap Bharat ke liye chunav prakriya shiksha sahayak hain.\n"
        "Saral Hindi mein uttar den, rajnitik roop se tatasth rahen, aur sirf "
        "chunav sambandhit margdarshan dein.\n"
        "Sarkari jaankari ke liye voters.eci.gov.in ka ullekh karein.\n"
    ),
}

# Starter suggestions shown before the first user message
SUGGESTIONS: dict[str, list[str]] = {
    "en": [
        "How do I register to vote?",
        "What is the minimum age to vote in India?",
        "What documents do I need for voter registration?",
        "How does the EVM work?",
        "What is NOTA?",
        "How to find my polling booth?",
        "Can NRIs vote in Indian elections?",
    ],
    "hi": [
        "Matdata panjikaran kaise karein?",
        "Matdaan ki nyuntam ayu kya hai?",
        "EVM kaise kaam karti hai?",
        "NOTA kya hai?",
    ],
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class Message(BaseModel):
    """A single turn in the conversation history."""

    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    """Payload for ``POST /api/chat/``."""

    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="en", pattern="^(en|hi)$")
    history: list[Message] = Field(default_factory=list, max_length=10)
    session_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        """Strip leading/trailing whitespace and reject blank strings."""
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


class ChatResponse(BaseModel):
    """Response shape for ``POST /api/chat/``."""

    response: str
    cached: bool = False
    session_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/", response_model=ChatResponse, summary="Send a chat message")
async def chat(req: ChatRequest, background_tasks: BackgroundTasks) -> ChatResponse:
    """Process a user message and return an AI-generated response.

    The response is cached by a SHA-256 fingerprint of the language + message
    for :data:`CACHE_TTL` seconds.  Cache population happens in a background
    task so the client is not blocked by the write.

    Args:
        req:              Validated chat request payload.
        background_tasks: FastAPI dependency for non-blocking background work.

    Returns:
        :class:`ChatResponse` containing the assistant reply, cache status,
        and the echoed ``session_id``.

    Raises:
        HTTPException 503: When ``GEMINI_API_KEY`` is not configured.
        HTTPException 504: When the Gemini API times out.
        HTTPException 502: When the Gemini API returns an error status.
        HTTPException 500: When the Gemini API returns an empty response.
    """
    cache_key = hashlib.sha256(
        f"{req.language}:{req.message.lower()[:80]}".encode()
    ).hexdigest()

    cached = cache_get(cache_key)
    if cached:
        logger.info("Cache hit for key %s", cache_key[:8])
        return ChatResponse(response=cached, cached=True, session_id=req.session_id)

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Set GEMINI_API_KEY.",
        )

    system_prompt = SYSTEM_PROMPTS.get(req.language, SYSTEM_PROMPTS["en"])
    messages = [
        {"role": "user", "parts": [{"text": f"SYSTEM: {system_prompt}"}]},
        {"role": "model", "parts": [{"text": "Understood. I'm ready to help with election education."}]},
        *[
            {
                "role": msg.role if msg.role == "user" else "model",
                "parts": [{"text": msg.content}],
            }
            for msg in req.history[-6:]
        ],
        {"role": "user", "parts": [{"text": req.message}]},
    ]

    payload: dict = {
        "contents": messages,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.95,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload
            )
            response.raise_for_status()
            data: dict = response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504, detail="AI service timed out. Please try again."
        ) from exc
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Gemini API error: %s - %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise HTTPException(
            status_code=502, detail="AI service error. Please try again."
        ) from exc

    text: str = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from AI service.")

    background_tasks.add_task(cache_set, cache_key, text)
    return ChatResponse(response=text, cached=False, session_id=req.session_id)


@router.get("/suggestions", summary="Get starter question suggestions")
async def get_suggestions(language: str = "en") -> dict:
    """Return a list of suggested starter questions for the given language.

    Args:
        language: BCP-47 language code. Supported: ``en``, ``hi``.
                  Falls back to English for unknown codes.

    Returns:
        dict: ``{"suggestions": list[str]}``
    """
    return {"suggestions": SUGGESTIONS.get(language, SUGGESTIONS["en"])}
