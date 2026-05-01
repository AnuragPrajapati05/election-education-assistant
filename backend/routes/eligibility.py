from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

router = APIRouter()


class EligibilityRequest(BaseModel):
    dob: date
    citizen: bool
    state: str = Field(..., min_length=2, max_length=60)
    has_voter_id: Optional[bool] = None
    disqualified: bool = False

    @field_validator("state")
    @classmethod
    def normalize_state(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("State is required")
        return cleaned


class EligibilityCheck(BaseModel):
    passed: bool = Field(alias="pass")
    check: str
    detail: str


class EligibilityResult(BaseModel):
    eligible: bool
    age: int
    checks: list[EligibilityCheck]
    message: str
    next_steps: list[str]


def get_qualifying_date(today: Optional[date] = None) -> date:
    reference_date = today or date.today()
    return date(reference_date.year, 1, 1)


def calculate_age_on_qualifying_date(dob: date, qualifying_date: Optional[date] = None) -> int:
    effective_qualifying_date = qualifying_date or get_qualifying_date()
    age = effective_qualifying_date.year - dob.year
    if (effective_qualifying_date.month, effective_qualifying_date.day) < (dob.month, dob.day):
        age -= 1
    return age


def evaluate_eligibility(req: EligibilityRequest, qualifying_date: Optional[date] = None) -> EligibilityResult:
    effective_qualifying_date = qualifying_date or get_qualifying_date()
    age = calculate_age_on_qualifying_date(req.dob, effective_qualifying_date)
    checks: list[dict] = []
    eligible = True
    next_steps = []

    if age >= 18:
        checks.append({"pass": True, "check": "Age", "detail": f"Age {age} - meets minimum 18 years requirement"})
    else:
        checks.append({"pass": False, "check": "Age", "detail": f"Age {age} - must be 18 by Jan 1 of qualifying year"})
        eligible = False
        next_steps.append("You will be eligible once you turn 18 and the next qualifying date is reached.")

    if req.citizen:
        checks.append({"pass": True, "check": "Citizenship", "detail": "Indian citizen - meets citizenship requirement"})
    else:
        checks.append({"pass": False, "check": "Citizenship", "detail": "Must be an Indian citizen"})
        eligible = False
        next_steps.append("Only Indian citizens can register to vote in India.")

    checks.append({"pass": True, "check": "Residence", "detail": f"Residing in {req.state} - can register in the local constituency"})

    if req.disqualified:
        checks.append({"pass": False, "check": "Legal Status", "detail": "Disqualified from voting under applicable law"})
        eligible = False
        next_steps.append("Resolve any legal disqualification before applying to the electoral roll.")
    else:
        checks.append({"pass": True, "check": "Legal Status", "detail": "No legal disqualification"})

    if req.has_voter_id is True:
        checks.append({"pass": True, "check": "Registration", "detail": "Already registered as a voter"})
    elif eligible:
        next_steps.append("Apply through Form 6 on voters.eci.gov.in to complete voter registration.")

    message = (
        "You are eligible to vote in Indian elections!"
        if eligible
        else "You are not currently eligible to vote. Review the failed checks and next steps below."
    )

    if eligible and not next_steps:
        next_steps = [
            "Verify your name on the electoral roll at electoralsearch.eci.gov.in.",
            "Download your eEPIC from voters.eci.gov.in.",
            "Check your assigned polling booth before election day.",
        ]

    return EligibilityResult(
        eligible=eligible,
        age=age,
        checks=checks,
        message=message,
        next_steps=next_steps,
    )


@router.post("/check", response_model=EligibilityResult)
async def check_eligibility(req: EligibilityRequest):
    return evaluate_eligibility(req)


analytics_router = APIRouter()


@analytics_router.get("/stats")
async def get_stats():
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


users_router = APIRouter()


class UserPreferences(BaseModel):
    language: str = Field(default="en", pattern="^(en|hi)$")
    high_contrast: bool = False
    font_size: str = Field(default="md", pattern="^(sm|md|lg)$")


@users_router.get("/profile/{uid}")
async def get_profile(uid: str):
    return {"uid": uid, "role": "user", "preferences": {"language": "en", "high_contrast": False}}


@users_router.put("/preferences/{uid}")
async def update_preferences(uid: str, prefs: UserPreferences):
    return {"success": True, "preferences": prefs.model_dump()}


booths_router = APIRouter()

MOCK_BOOTHS = [
    {"id": 1, "name": "Government Primary School, Sector 15", "address": "Sector 15, Chandigarh", "lat": 30.7355, "lng": 76.7883, "constituency": "Chandigarh"},
    {"id": 2, "name": "Community Hall, Sector 17", "address": "Sector 17, Chandigarh", "lat": 30.7410, "lng": 76.7840, "constituency": "Chandigarh"},
    {"id": 3, "name": "DAV Public School", "address": "Sector 8, Chandigarh", "lat": 30.7460, "lng": 76.7960, "constituency": "Chandigarh"},
]


@booths_router.get("/search")
async def search_booths(
    epic: Optional[str] = None,
    pincode: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    has_coordinates = lat is not None or lng is not None
    if not any([epic, pincode, has_coordinates]):
        raise HTTPException(status_code=400, detail="Provide at least one search parameter: epic, pincode, or lat/lng")

    if epic and (len(epic) < 5 or len(epic) > 12):
        raise HTTPException(status_code=400, detail="Invalid EPIC number format")
    if pincode and (not pincode.isdigit() or len(pincode) != 6):
        raise HTTPException(status_code=400, detail="Pincode must be a 6-digit number")
    if has_coordinates and (lat is None or lng is None):
        raise HTTPException(status_code=400, detail="Latitude and longitude must be provided together")
    if lat is not None and not (-90 <= lat <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if lng is not None and not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")

    return {
        "assigned_booth": MOCK_BOOTHS[0],
        "nearby_booths": MOCK_BOOTHS[1:],
        "constituency": "Chandigarh (UT)",
        "note": "Demo data. Real data requires ECI API integration.",
    }
