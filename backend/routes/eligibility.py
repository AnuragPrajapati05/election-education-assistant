# backend/routes/eligibility.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime

router = APIRouter()

class EligibilityRequest(BaseModel):
    dob: date
    citizen: bool
    state: str = Field(..., min_length=2, max_length=60)
    has_voter_id: Optional[bool] = None
    disqualified: bool = False

class EligibilityResult(BaseModel):
    eligible: bool
    age: int
    checks: List[dict]
    message: str
    next_steps: List[str]

@router.post("/check", response_model=EligibilityResult)
async def check_eligibility(req: EligibilityRequest):
    checks = []
    eligible = True
    next_steps = []

    # Age check (qualifying date: Jan 1 of current year)
    qualifying_date = date(date.today().year, 1, 1)
    age = qualifying_date.year - req.dob.year
    if (qualifying_date.month, qualifying_date.day) < (req.dob.month, req.dob.day):
        age -= 1

    if age >= 18:
        checks.append({"pass": True, "check": "Age", "detail": f"Age {age} — meets minimum 18 years requirement"})
    else:
        checks.append({"pass": False, "check": "Age", "detail": f"Age {age} — must be 18 by Jan 1 of qualifying year"})
        eligible = False
        next_steps.append(f"You will be eligible to vote when you turn 18. Apply during the next electoral roll revision.")

    # Citizenship
    if req.citizen:
        checks.append({"pass": True, "check": "Citizenship", "detail": "Indian citizen — meets citizenship requirement"})
    else:
        checks.append({"pass": False, "check": "Citizenship", "detail": "Must be an Indian citizen"})
        eligible = False
        next_steps.append("Only Indian citizens can vote. Obtain citizenship first.")

    # State / Residence
    checks.append({"pass": True, "check": "Residence", "detail": f"Residing in {req.state} — can register in local constituency"})

    # Disqualification
    if req.disqualified:
        checks.append({"pass": False, "check": "Legal Status", "detail": "Disqualified from voting under applicable law"})
        eligible = False
    else:
        checks.append({"pass": True, "check": "Legal Status", "detail": "No legal disqualification"})

    # Voter ID
    if req.has_voter_id is False and eligible:
        next_steps.append("You need to register as a voter. Apply via Form 6 at voters.eci.gov.in.")
    elif req.has_voter_id is True:
        checks.append({"pass": True, "check": "Registration", "detail": "Already registered as a voter"})

    message = (
        "You are eligible to vote in Indian elections! 🎉" if eligible
        else "You are not currently eligible to vote. See details below."
    )

    if eligible and not next_steps:
        next_steps = ["Verify your name on the Electoral Roll at electoralsearch.eci.gov.in",
                      "Download your eEPIC (digital Voter ID) from voters.eci.gov.in",
                      "Check your assigned polling booth before election day"]

    return EligibilityResult(eligible=eligible, age=age, checks=checks, message=message, next_steps=next_steps)


# ─────────────────────────────────────────────────────────────────────────────
# backend/routes/analytics.py  (appended to same file for packaging convenience)
# In production, split into separate files

from fastapi import APIRouter as _APIRouter
analytics_router = _APIRouter()

@analytics_router.get("/stats")
async def get_stats():
    """Return platform analytics. In production, fetch from Firestore."""
    return {
        "totalUsers": 1247,
        "chatSessions": 3891,
        "avgEngagement": "4m 32s",
        "eligibilityChecks": 892,
        "registrationStarts": 543,
        "completionRate": "67%",
        "topQuestions": [
            {"question": "How to register to vote?", "count": 342},
            {"question": "Eligibility requirements", "count": 291},
            {"question": "Documents needed", "count": 218},
            {"question": "How does EVM work?", "count": 187},
            {"question": "Find polling booth", "count": 156},
        ],
        "languageBreakdown": {"en": 78, "hi": 22},
    }


# ─────────────────────────────────────────────────────────────────────────────
# backend/routes/users.py

users_router = _APIRouter()

class UserPreferences(BaseModel):
    language: str = Field(default="en", pattern="^(en|hi)$")
    high_contrast: bool = False
    font_size: str = Field(default="md", pattern="^(sm|md|lg)$")

@users_router.get("/profile/{uid}")
async def get_profile(uid: str):
    """Get user profile from Firestore. Protected route."""
    # In production: verify Firebase token + fetch from Firestore
    return {"uid": uid, "role": "user", "preferences": {"language": "en", "high_contrast": False}}

@users_router.put("/preferences/{uid}")
async def update_preferences(uid: str, prefs: UserPreferences):
    """Update user preferences. In production: save to Firestore."""
    return {"success": True, "preferences": prefs.dict()}


# ─────────────────────────────────────────────────────────────────────────────
# backend/routes/booths.py

booths_router = _APIRouter()

MOCK_BOOTHS = [
    {"id": 1, "name": "Government Primary School, Sector 15", "address": "Sector 15, Chandigarh", "lat": 30.7355, "lng": 76.7883, "constituency": "Chandigarh"},
    {"id": 2, "name": "Community Hall, Sector 17", "address": "Sector 17, Chandigarh", "lat": 30.7410, "lng": 76.7840, "constituency": "Chandigarh"},
    {"id": 3, "name": "DAV Public School", "address": "Sector 8, Chandigarh", "lat": 30.7460, "lng": 76.7960, "constituency": "Chandigarh"},
]

@booths_router.get("/search")
async def search_booths(epic: Optional[str] = None, pincode: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None):
    """
    Find polling booths by EPIC, pincode, or location.
    In production: query Firestore/ECI API with real booth data.
    """
    if not any([epic, pincode, lat]):
        raise HTTPException(status_code=400, detail="Provide at least one search parameter: epic, pincode, or lat/lng")
    
    # Validate inputs
    if epic and (len(epic) < 5 or len(epic) > 12):
        raise HTTPException(status_code=400, detail="Invalid EPIC number format")
    if pincode and (not pincode.isdigit() or len(pincode) != 6):
        raise HTTPException(status_code=400, detail="Pincode must be a 6-digit number")

    # In production: call ECI API or query spatial database
    return {
        "assigned_booth": MOCK_BOOTHS[0],
        "nearby_booths": MOCK_BOOTHS[1:],
        "constituency": "Chandigarh (UT)",
        "note": "Demo data. Real data requires ECI API integration."
    }
