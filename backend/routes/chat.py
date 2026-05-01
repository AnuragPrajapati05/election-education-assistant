# backend/routes/chat.py
"""
AI Chat route — proxies requests to Gemini API with server-side key management,
caching, conversation history, and moderation.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import httpx
import os
import hashlib
import json
import time
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)
router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# ─── Simple in-process cache ──────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 300  # 5 minutes

def cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["value"]
    return None

def cache_set(key: str, value: str):
    _cache[key] = {"value": value, "ts": time.time()}
    # Evict old entries if cache grows large
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda x: x[1]["ts"])[:100]
        for k, _ in oldest:
            _cache.pop(k, None)


# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPTS = {
    "en": """You are the Election Process Education Assistant for India — a knowledgeable, friendly civic educator.
Your role is to help citizens understand:
- Voter registration steps and required documents
- Eligibility criteria (age, citizenship, residence)
- Election schedules, types (Lok Sabha, Vidhan Sabha, local), and important dates
- Electronic Voting Machine (EVM) and VVPAT process
- How to find polling booths and check voter roll
- NOTA, voter rights, and Model Code of Conduct
- Election Commission of India procedures and forms (Form 6, 7, 8)

Rules:
- Keep responses helpful and concise (max 4 paragraphs or bullet list)
- Use simple, accessible language — avoid legalese
- Be strictly politically NEUTRAL — never mention parties, candidates, or political opinions
- Provide step-by-step guidance when applicable
- For incorrect/harmful queries, politely redirect to elections topic
- End factual claims with the disclaimer: "For official info, visit voters.eci.gov.in"
""",
    "hi": """आप भारत के लिए चुनाव प्रक्रिया शिक्षा सहायक हैं।
सरल हिंदी में उत्तर दें। राजनीतिक रूप से तटस्थ रहें।
केवल चुनाव, मतदान, पंजीकरण और नागरिक शिक्षा के बारे में बात करें।
""",
}

# ─── Models ───────────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    language: str = Field(default="en", pattern="^(en|hi)$")
    history: List[Message] = Field(default=[], max_items=10)
    session_id: Optional[str] = None

    @validator("message")
    def sanitize_message(cls, v):
        # Basic sanitization — strip leading/trailing whitespace, limit special chars
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v

class ChatResponse(BaseModel):
    response: str
    cached: bool = False
    session_id: Optional[str] = None

# ─── Route ────────────────────────────────────────────────────────────────────
@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    # Build cache key from message + language
    cache_key = hashlib.md5(f"{req.language}:{req.message.lower()[:80]}".encode()).hexdigest()
    cached = cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for key {cache_key[:8]}")
        return ChatResponse(response=cached, cached=True, session_id=req.session_id)

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured. Set GEMINI_API_KEY.")

    system = SYSTEM_PROMPTS.get(req.language, SYSTEM_PROMPTS["en"])
    messages = [
        {"role": "user", "parts": [{"text": f"SYSTEM: {system}"}]},
        {"role": "model", "parts": [{"text": "Understood. I'm ready to help with election education."}]},
        *[
            {"role": m.role if m.role == "user" else "model", "parts": [{"text": m.content}]}
            for m in req.history[-6:]  # Last 6 turns only
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
            r = await client.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload)
            r.raise_for_status()
            data = r.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
    except httpx.HTTPStatusError as e:
        logger.error(f"Gemini API error: {e.response.status_code} — {e.response.text}")
        raise HTTPException(status_code=502, detail="AI service error. Please try again.")

    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not text:
        raise HTTPException(status_code=500, detail="Empty response from AI service.")

    # Cache in background
    background_tasks.add_task(cache_set, cache_key, text)

    return ChatResponse(response=text, cached=False, session_id=req.session_id)


@router.get("/suggestions")
async def get_suggestions(language: str = "en"):
    """Get suggested starter questions based on language."""
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
            "मतदाता पंजीकरण कैसे करें?",
            "मतदान की न्यूनतम आयु क्या है?",
            "EVM कैसे काम करती है?",
            "NOTA क्या है?",
        ],
    }
    return {"suggestions": suggestions.get(language, suggestions["en"])}
