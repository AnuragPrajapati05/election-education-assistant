"""Tests for rate limiter middleware and auth utilities."""

import os
import sys
import time
import threading

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


class TestRateLimiter:
    """Unit tests for the sliding-window rate limiter."""

    def _make_limiter(self, rpm: int = 5):
        from middleware.rate_limit import RateLimiter
        return RateLimiter(requests_per_minute=rpm)

    def test_allows_requests_within_limit(self):
        limiter = self._make_limiter(rpm=5)
        for _ in range(5):
            assert limiter.is_allowed("user-1") is True

    def test_blocks_requests_exceeding_limit(self):
        limiter = self._make_limiter(rpm=3)
        for _ in range(3):
            limiter.is_allowed("user-x")
        assert limiter.is_allowed("user-x") is False

    def test_isolates_rate_limits_per_identifier(self):
        limiter = self._make_limiter(rpm=2)
        limiter.is_allowed("user-a")
        limiter.is_allowed("user-a")
        # user-a is exhausted; user-b should still be allowed
        assert limiter.is_allowed("user-b") is True

    def test_get_remaining_starts_at_full_quota(self):
        limiter = self._make_limiter(rpm=10)
        assert limiter.get_remaining("fresh-user") == 10

    def test_get_remaining_decreases_after_requests(self):
        limiter = self._make_limiter(rpm=10)
        for _ in range(4):
            limiter.is_allowed("quota-user")
        assert limiter.get_remaining("quota-user") == 6

    def test_get_remaining_never_goes_below_zero(self):
        limiter = self._make_limiter(rpm=2)
        for _ in range(5):
            limiter.is_allowed("over-user")
        assert limiter.get_remaining("over-user") == 0

    def test_is_thread_safe(self):
        """Multiple threads incrementing the same identifier should not corrupt state."""
        limiter = self._make_limiter(rpm=1000)
        errors = []

        def spam():
            try:
                for _ in range(50):
                    limiter.is_allowed("shared-user")
            except Exception as exc:
                errors.append(exc)

        threads = [threading.Thread(target=spam) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors

    def test_old_entries_are_evicted_after_window(self):
        """Simulate window expiry by backdating request timestamps."""
        from middleware.rate_limit import RateLimiter
        limiter = RateLimiter(requests_per_minute=2)
        # Exhaust the limit
        limiter.is_allowed("time-user")
        limiter.is_allowed("time-user")
        assert limiter.is_allowed("time-user") is False

        # Backdate all recorded timestamps to simulate window expiry
        q = limiter.requests["time-user"]
        for i in range(len(q)):
            q[i] = time.time() - 120  # 2 minutes ago

        # Should be allowed again
        assert limiter.is_allowed("time-user") is True


class TestSecurityHeaders:
    """Verify security headers are present on all responses."""

    @pytest.fixture
    def client(self):
        from main import app
        from fastapi.testclient import TestClient
        return TestClient(app)

    def test_x_content_type_options_header(self, client):
        response = client.get("/api/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options_header(self, client):
        response = client.get("/api/health")
        assert response.headers.get("X-Frame-Options") == "SAMEORIGIN"

    def test_referrer_policy_header(self, client):
        response = client.get("/api/health")
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_permissions_policy_header(self, client):
        response = client.get("/api/health")
        assert "camera=()" in response.headers.get("Permissions-Policy", "")

    def test_x_process_time_header_is_numeric(self, client):
        response = client.get("/api/health")
        process_time = response.headers.get("X-Process-Time", "")
        assert process_time.endswith("s")
        assert float(process_time.rstrip("s")) >= 0

    def test_404_returns_json_not_html(self, client):
        response = client.get("/api/nonexistent-endpoint")
        assert response.status_code == 404
        assert response.json()["detail"] == "Resource not found"
