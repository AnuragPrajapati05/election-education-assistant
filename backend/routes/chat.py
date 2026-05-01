"""
AI chat routes with Gemini proxying, lightweight caching, and starter prompts.
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

_cache: dict[str, dict[str, float | str]] = {}
CACHE_TTL = 300


def cache_get(key: str) -> Optional[str]:
    entry = _cache.get(key)
    if entry and time.time() - float(entry["ts"]) < CACHE_TTL:
        return str(entry["value"])
    return None


def cache_set(key: str, value: str):
    _cache[key] = {"value": value, "ts": time.time()}
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda item: item[1]["ts"])[:100]
        for cache_key, _ in oldest:
            _cache.pop(cache_key, None)


SYSTEM_PROMPTS = {
    "en": """You are the Election Process Education Assistant for India, a knowledgeable and friendly civic educator.
Your role is to help citizens understand voter registration, eligibility, election schedules, EVMs, polling booths,
NOTA, voter rights, and Election Commission of India procedures.

Rules:
- Keep responses concise and helpful.
- Use simple, accessible language.
- Stay politically neutral.
- Give step-by-step guidance when useful.
- Redirect non-election topics politely.
- End factual claims with: "For official info, visit voters.eci.gov.in"
""",
    "hi": """Aap Bharat ke liye chunav prakriya shiksha sahayak hain.
Saral Hindi mein uttar den, rajnitik roop se tatasth rahen, aur sirf chunav sambandhit margdarshan dein.
""",
}


class Message(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="en", pattern="^(en|hi)$")
    history: list[Message] = Field(default_factory=list, max_length=10)
    session_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message cannot be empty")
        return cleaned


class ChatResponse(BaseModel):
    response: str
    cached: bool = False
    session_id: Optional[str] = None


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    cache_key = hashlib.sha256(f"{req.language}:{req.message.lower()[:80]}".encode()).hexdigest()
    cached = cache_get(cache_key)
    if cached:
        logger.info("Cache hit for key %s", cache_key[:8])
        return ChatResponse(response=cached, cached=True, session_id=req.session_id)

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Set GEMINI_API_KEY.")

    system_prompt = SYSTEM_PROMPTS.get(req.language, SYSTEM_PROMPTS["en"])
    messages = [
        {"role": "user", "parts": [{"text": f"SYSTEM: {system_prompt}"}]},
        {"role": "model", "parts": [{"text": "Understood. I'm ready to help with election education."}]},
        *[
            {"role": message.role if message.role == "user" else "model", "parts": [{"text": message.content}]}
            for message in req.history[-6:]
        ],
        {"role": "user", "parts": [{"text": req.message}]},
    ]

    payload = {
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
            response = await client.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.") from exc
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini API error: %s - %s", exc.response.status_code, exc.response.text)
        raise HTTPException(status_code=502, detail="AI service error. Please try again.") from exc

    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from AI service.")

    background_tasks.add_task(cache_set, cache_key, text)
    return ChatResponse(response=text, cached=False, session_id=req.session_id)


@router.get("/suggestions")
async def get_suggestions(language: str = "en"):
    suggestions = {
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
    return {"suggestions": suggestions.get(language, suggestions["en"])}
