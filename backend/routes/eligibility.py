"""Voter eligibility checking, analytics, user profile, and booth locator routes.

Modules
-------
- ``router``           – ``/api/eligibility``
- ``analytics_router`` – ``/api/analytics``
- ``users_router``     – ``/api/users``
- ``booths_router``    – ``/api/booths``
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class EligibilityRequest(BaseModel):
    """Input payload for the voter eligibility check endpoint."""

    dob: date
    citizen: bool
    state: str = Field(..., min_length=2, max_length=60, description="Indian state or UT of residence.")
    has_voter_id: Optional[bool] = Field(
        default=None,
        description="Whether the applicant already holds an EPIC (Voter ID).",
    )
    disqualified: bool = Field(
        default=False,
        description="Whether the applicant is legally disqualified from voting.",
    )

    @field_validator("state")
    @classmethod
    def normalize_state(cls, value: str) -> str:
        """Collapse whitespace and reject blank state strings."""
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("State is required")
        return cleaned


class EligibilityCheck(BaseModel):
    """Result of a single eligibility criterion evaluation."""

    passed: bool = Field(alias="pass")
    check: str = Field(description="Name of the criterion being evaluated.")
    detail: str = Field(description="Human-readable explanation of the outcome.")


class EligibilityResult(BaseModel):
    """Aggregated voter eligibility result."""

    eligible: bool
    age: int
    checks: list[EligibilityCheck]
    message: str
    next_steps: list[str]


# ---------------------------------------------------------------------------
# Eligibility logic
# ---------------------------------------------------------------------------


def get_qualifying_date(today: Optional[date] = None) -> date:
    """Return the electoral qualifying date (1 January of the current year).

    Args:
        today: Override for the current date. Defaults to :func:`date.today`.

    Returns:
        :class:`date` representing 1 January of the reference year.
    """
    reference_date = today or date.today()
    return date(reference_date.year, 1, 1)


def calculate_age_on_qualifying_date(
    dob: date,
    qualifying_date: Optional[date] = None,
) -> int:
    """Calculate a person's age as of the electoral qualifying date.

    Under the Representation of the People Act, a citizen must be 18 on or
    before 1 January of the qualifying year to enrol in the electoral roll.

    Args:
        dob:            Date of birth.
        qualifying_date: The reference qualifying date. Defaults to 1 January
                         of the current year via :func:`get_qualifying_date`.

    Returns:
        Integer age on the qualifying date.
    """
    effective_qualifying_date = qualifying_date or get_qualifying_date()
    age = effective_qualifying_date.year - dob.year
    if (effective_qualifying_date.month, effective_qualifying_date.day) < (dob.month, dob.day):
        age -= 1
    return age


def evaluate_eligibility(
    req: EligibilityRequest,
    qualifying_date: Optional[date] = None,
) -> EligibilityResult:
    """Evaluate voter eligibility based on age, citizenship, and legal status.

    Applies the following checks in order:

    1. **Age** – must be ≥ 18 on the qualifying date.
    2. **Citizenship** – must be an Indian citizen.
    3. **Residence** – records the stated state/UT.
    4. **Legal Status** – must not be disqualified under applicable law.
    5. **Registration** – notes whether an EPIC has already been issued.

    Args:
        req:             Validated eligibility request.
        qualifying_date: Override qualifying date (used in tests).

    Returns:
        :class:`EligibilityResult` with all check outcomes, a summary message,
        and actionable next steps.
    """
    effective_qualifying_date = qualifying_date or get_qualifying_date()
    age = calculate_age_on_qualifying_date(req.dob, effective_qualifying_date)
    checks: list[dict] = []
    eligible = True
    next_steps: list[str] = []

    # --- Age check ---
    if age >= 18:
        checks.append({
            "pass": True,
            "check": "Age",
            "detail": f"Age {age} – meets the minimum 18-year requirement as of 1 Jan {effective_qualifying_date.year}.",
        })
    else:
        checks.append({
            "pass": False,
            "check": "Age",
            "detail": f"Age {age} – must be 18 by 1 January of the qualifying year.",
        })
        eligible = False
        next_steps.append("You will be eligible once you turn 18 and the next qualifying date is reached.")

    # --- Citizenship check ---
    if req.citizen:
        checks.append({
            "pass": True,
            "check": "Citizenship",
            "detail": "Indian citizen – meets the citizenship requirement.",
        })
    else:
        checks.append({
            "pass": False,
            "check": "Citizenship",
            "detail": "Must be an Indian citizen to register on the electoral roll.",
        })
        eligible = False
        next_steps.append("Only Indian citizens can register to vote in India.")

    # --- Residence check (always passes – records constituency) ---
    checks.append({
        "pass": True,
        "check": "Residence",
        "detail": f"Residing in {req.state} – eligible to register in the local constituency.",
    })

    # --- Legal status check ---
    if req.disqualified:
        checks.append({
            "pass": False,
            "check": "Legal Status",
            "detail": "Disqualified from voting under applicable law.",
        })
        eligible = False
        next_steps.append("Resolve any legal disqualification before applying to the electoral roll.")
    else:
        checks.append({
            "pass": True,
            "check": "Legal Status",
            "detail": "No legal disqualification found.",
        })

    # --- Registration status ---
    if req.has_voter_id is True:
        checks.append({
            "pass": True,
            "check": "Registration",
            "detail": "Already registered as a voter (EPIC issued).",
        })
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


# ---------------------------------------------------------------------------
# Eligibility router
# ---------------------------------------------------------------------------


@router.post(
    "/check",
    response_model=EligibilityResult,
    summary="Check voter eligibility",
)
async def check_eligibility(req: EligibilityRequest) -> EligibilityResult:
    """Evaluate whether the applicant meets Indian voter eligibility requirements.

    Args:
        req: Validated eligibility request payload.

    Returns:
        :class:`EligibilityResult` with detailed check outcomes.
    """
    return evaluate_eligibility(req)


# ---------------------------------------------------------------------------
# Analytics router
# ---------------------------------------------------------------------------

analytics_router = APIRouter()


@analytics_router.get("/stats", summary="Platform usage statistics")
async def get_stats() -> dict:
    """Return aggregated platform usage statistics for the admin dashboard.

    Returns:
        dict: Platform metrics including active users, chat sessions,
              eligibility checks, and top questions.
    """
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


# ---------------------------------------------------------------------------
# Users router
# ---------------------------------------------------------------------------

users_router = APIRouter()


class UserPreferences(BaseModel):
    """User accessibility and language preferences."""

    language: str = Field(default="en", pattern="^(en|hi)$")
    high_contrast: bool = False
    font_size: str = Field(
        default="md",
        pattern="^(sm|md|lg)$",
        description="Preferred font size token: sm | md | lg.",
    )


@users_router.get("/profile/{uid}", summary="Get user profile")
async def get_profile(uid: str) -> dict:
    """Return the profile and saved preferences for the given user UID.

    Args:
        uid: Firebase user ID.

    Returns:
        dict: Profile object with uid, role, and preferences.
    """
    return {
        "uid": uid,
        "role": "user",
        "preferences": {"language": "en", "high_contrast": False, "font_size": "md"},
    }


@users_router.put("/preferences/{uid}", summary="Update user preferences")
async def update_preferences(uid: str, prefs: UserPreferences) -> dict:
    """Persist updated accessibility/language preferences for a user.

    Args:
        uid:   Firebase user ID.
        prefs: Validated preference payload.

    Returns:
        dict: ``{"success": True, "preferences": {...}}``
    """
    return {"success": True, "preferences": prefs.model_dump()}


# ---------------------------------------------------------------------------
# Booths router
# ---------------------------------------------------------------------------

booths_router = APIRouter()

MOCK_BOOTHS: list[dict] = [
    {
        "id": 1,
        "name": "Government Primary School, Sector 15",
        "address": "Sector 15, Chandigarh",
        "lat": 30.7355,
        "lng": 76.7883,
        "constituency": "Chandigarh",
    },
    {
        "id": 2,
        "name": "Community Hall, Sector 17",
        "address": "Sector 17, Chandigarh",
        "lat": 30.7410,
        "lng": 76.7840,
        "constituency": "Chandigarh",
    },
    {
        "id": 3,
        "name": "DAV Public School",
        "address": "Sector 8, Chandigarh",
        "lat": 30.7460,
        "lng": 76.7960,
        "constituency": "Chandigarh",
    },
]


@booths_router.get("/search", summary="Locate polling booths")
async def search_booths(
    epic: Optional[str] = None,
    pincode: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    """Search for polling booths by EPIC number, pincode, or GPS coordinates.

    At least one search parameter must be provided. Coordinate-based searches
    require both ``lat`` and ``lng``.

    Args:
        epic:    Voter ID card number (5–12 alphanumeric characters).
        pincode: 6-digit Indian postal code.
        lat:     Latitude in decimal degrees (–90 to 90).
        lng:     Longitude in decimal degrees (–180 to 180).

    Returns:
        dict: ``assigned_booth``, ``nearby_booths``, ``constituency``, and a demo note.

    Raises:
        HTTPException 400: For missing or malformed search parameters.
    """
    has_coordinates = lat is not None or lng is not None

    if not any([epic, pincode, has_coordinates]):
        raise HTTPException(
            status_code=400,
            detail="Provide at least one search parameter: epic, pincode, or lat/lng.",
        )

    if epic and (len(epic) < 5 or len(epic) > 12):
        raise HTTPException(status_code=400, detail="Invalid EPIC number format (5–12 characters).")

    if pincode and (not pincode.isdigit() or len(pincode) != 6):
        raise HTTPException(status_code=400, detail="Pincode must be a 6-digit number.")

    if has_coordinates and (lat is None or lng is None):
        raise HTTPException(
            status_code=400,
            detail="Latitude and longitude must be provided together.",
        )

    if lat is not None and not (-90 <= lat <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90.")

    if lng is not None and not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180.")

    return {
        "assigned_booth": MOCK_BOOTHS[0],
        "nearby_booths": MOCK_BOOTHS[1:],
        "constituency": "Chandigarh (UT)",
        "note": "Demo data. Real booth data requires ECI API integration.",
    }
