"""Backend tests for eligibility, auxiliary routes, and API validation."""

import os
import sys
from datetime import date

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from routes.eligibility import (
    EligibilityRequest,
    calculate_age_on_qualifying_date,
    evaluate_eligibility,
)


QUALIFYING_DATE = date(2026, 1, 1)


def make_request(**overrides):
    payload = {
        "dob": date(2000, 1, 1),
        "citizen": True,
        "state": "Delhi",
        "has_voter_id": False,
        "disqualified": False,
    }
    payload.update(overrides)
    return EligibilityRequest(**payload)


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


class TestEligibilityLogic:
    def test_calculate_age_handles_exact_boundary(self):
        assert calculate_age_on_qualifying_date(date(2008, 1, 1), QUALIFYING_DATE) == 18

    def test_calculate_age_handles_day_after_boundary(self):
        assert calculate_age_on_qualifying_date(date(2008, 1, 2), QUALIFYING_DATE) == 17

    def test_eligible_citizen_gets_registration_step_when_not_registered(self):
        result = evaluate_eligibility(make_request(dob=date(2000, 5, 10)), QUALIFYING_DATE)
        assert result.eligible is True
        assert result.age == 25
        assert any("Form 6" in step for step in result.next_steps)

    def test_registered_voter_gets_post_eligibility_guidance(self):
        result = evaluate_eligibility(
            make_request(dob=date(1995, 7, 1), has_voter_id=True),
            QUALIFYING_DATE,
        )
        assert result.eligible is True
        assert any(check.check == "Registration" for check in result.checks)
        assert any("electoral roll" in step.lower() for step in result.next_steps)

    def test_underage_applicant_is_not_eligible(self):
        result = evaluate_eligibility(make_request(dob=date(2008, 1, 2)), QUALIFYING_DATE)
        assert result.eligible is False
        assert result.age == 17
        assert result.checks[0].passed is False

    def test_non_citizen_is_not_eligible(self):
        result = evaluate_eligibility(make_request(citizen=False), QUALIFYING_DATE)
        assert result.eligible is False
        assert any(check.check == "Citizenship" and check.passed is False for check in result.checks)

    def test_disqualified_applicant_is_not_eligible(self):
        result = evaluate_eligibility(make_request(disqualified=True), QUALIFYING_DATE)
        assert result.eligible is False
        assert any(check.check == "Legal Status" and check.passed is False for check in result.checks)


class TestApiRoutes:
    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "operational"
        assert "Election Education" in body["service"]

    def test_health_endpoint(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_eligibility_endpoint_returns_expected_shape(self, client):
        response = client.post(
            "/api/eligibility/check",
            json={
                "dob": "2000-05-10",
                "citizen": True,
                "state": "Delhi",
                "has_voter_id": False,
                "disqualified": False,
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["eligible"] is True
        assert body["age"] == 25
        assert len(body["checks"]) >= 4

    def test_eligibility_endpoint_rejects_invalid_state(self, client):
        response = client.post(
            "/api/eligibility/check",
            json={"dob": "2000-01-01", "citizen": True, "state": ""},
        )
        assert response.status_code == 422

    def test_suggestions_fallbacks_to_english_for_unknown_language(self, client):
        response = client.get("/api/chat/suggestions?language=bn")
        assert response.status_code == 200
        body = response.json()
        assert body["suggestions"][0] == "How do I register to vote?"

    def test_chat_rejects_empty_messages(self, client):
        response = client.post("/api/chat/", json={"message": "   ", "language": "en"})
        assert response.status_code == 422

    def test_chat_returns_service_unavailable_without_api_key(self, client, monkeypatch):
        import routes.chat as chat_module

        monkeypatch.setattr(chat_module, "GEMINI_API_KEY", None)
        response = client.post("/api/chat/", json={"message": "Explain NOTA", "language": "en"})
        assert response.status_code == 503
        assert "AI service not configured" in response.json()["detail"]

    def test_analytics_stats_endpoint(self, client):
        response = client.get("/api/analytics/stats")
        assert response.status_code == 200
        body = response.json()
        assert body["totalUsers"] > 0
        assert "languageBreakdown" in body

    def test_get_profile_endpoint(self, client):
        response = client.get("/api/users/profile/test-user")
        assert response.status_code == 200
        assert response.json()["uid"] == "test-user"

    def test_update_preferences_accepts_valid_payload(self, client):
        response = client.put(
            "/api/users/preferences/test-user",
            json={"language": "hi", "high_contrast": True, "font_size": "lg"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["preferences"]["font_size"] == "lg"

    def test_update_preferences_rejects_invalid_language(self, client):
        response = client.put(
            "/api/users/preferences/test-user",
            json={"language": "fr", "high_contrast": False, "font_size": "md"},
        )
        assert response.status_code == 422

    def test_booth_search_requires_search_criteria(self, client):
        response = client.get("/api/booths/search")
        assert response.status_code == 400

    def test_booth_search_rejects_bad_pincode(self, client):
        response = client.get("/api/booths/search?pincode=123")
        assert response.status_code == 400

    def test_booth_search_requires_complete_coordinates(self, client):
        response = client.get("/api/booths/search?lat=30.7")
        assert response.status_code == 400
        assert "Latitude and longitude" in response.json()["detail"]

    def test_booth_search_rejects_out_of_range_coordinates(self, client):
        response = client.get("/api/booths/search?lat=120&lng=76.8")
        assert response.status_code == 400
        assert "Latitude" in response.json()["detail"]

    def test_booth_search_returns_demo_booths_for_valid_pincode(self, client):
        response = client.get("/api/booths/search?pincode=160015")
        assert response.status_code == 200
        body = response.json()
        assert body["assigned_booth"]["constituency"] == "Chandigarh"
        assert len(body["nearby_booths"]) == 2
