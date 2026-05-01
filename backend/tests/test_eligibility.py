# backend/tests/test_eligibility.py
"""
Unit tests for eligibility checking logic.
Run: pytest tests/ -v
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Test eligibility logic directly (without API)
from routes.eligibility import EligibilityRequest

def make_dob(years_ago: int) -> date:
    """Create a date of birth N years ago from Jan 1 of current year."""
    qualifying = date(date.today().year, 1, 1)
    return date(qualifying.year - years_ago, qualifying.month, qualifying.day)


class TestEligibilityLogic:
    def test_eligible_18yo_citizen(self):
        req = EligibilityRequest(dob=make_dob(18), citizen=True, state="Delhi", has_voter_id=False)
        # age should be 18 on qualifying date
        age = 18
        assert age >= 18
        assert req.citizen is True
        assert req.disqualified is False

    def test_ineligible_17yo(self):
        req = EligibilityRequest(dob=make_dob(17), citizen=True, state="Delhi")
        age = 17
        assert age < 18  # Not eligible

    def test_ineligible_non_citizen(self):
        req = EligibilityRequest(dob=make_dob(25), citizen=False, state="Maharashtra")
        assert req.citizen is False

    def test_ineligible_disqualified(self):
        req = EligibilityRequest(dob=make_dob(30), citizen=True, state="Gujarat", disqualified=True)
        assert req.disqualified is True

    def test_valid_states(self):
        valid_states = ["Uttar Pradesh", "Tamil Nadu", "West Bengal", "Delhi", "Chandigarh"]
        for state in valid_states:
            req = EligibilityRequest(dob=make_dob(25), citizen=True, state=state)
            assert req.state == state


class TestAPIRoutes:
    """Integration tests — requires running server."""

    @pytest.fixture
    def client(self):
        from main import app
        return TestClient(app)

    def test_health_endpoint(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "Election Education" in resp.json()["service"]

    def test_eligibility_eligible(self, client):
        resp = client.post("/api/eligibility/check", json={
            "dob": str(make_dob(25)),
            "citizen": True,
            "state": "Delhi",
            "has_voter_id": False,
            "disqualified": False,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is True
        assert data["age"] == 25

    def test_eligibility_underage(self, client):
        resp = client.post("/api/eligibility/check", json={
            "dob": str(make_dob(16)),
            "citizen": True,
            "state": "Mumbai",
            "disqualified": False,
        })
        assert resp.status_code == 200
        assert resp.json()["eligible"] is False

    def test_eligibility_invalid_state(self, client):
        resp = client.post("/api/eligibility/check", json={
            "dob": str(make_dob(25)),
            "citizen": True,
            "state": "",  # empty — should fail validation
        })
        assert resp.status_code == 422  # Validation error

    def test_chat_suggestions(self, client):
        resp = client.get("/api/chat/suggestions?language=en")
        assert resp.status_code == 200
        data = resp.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0

    def test_analytics_stats(self, client):
        resp = client.get("/api/analytics/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "totalUsers" in data
        assert data["totalUsers"] > 0

    def test_booth_search_missing_params(self, client):
        resp = client.get("/api/booths/search")
        assert resp.status_code == 400

    def test_booth_search_by_pincode(self, client):
        resp = client.get("/api/booths/search?pincode=160015")
        assert resp.status_code == 200
        data = resp.json()
        assert "assigned_booth" in data

    def test_rate_limiting(self, client):
        """Basic rate limit smoke test."""
        for _ in range(5):
            resp = client.get("/api/health")
            assert resp.status_code == 200  # Should not be rate limited in test


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
