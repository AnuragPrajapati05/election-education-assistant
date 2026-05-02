"""Tests for the AI chat routes including caching, validation, and suggestions."""

import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


class TestChatValidation:
    """Validate request/response shapes and input constraints."""

    def test_chat_rejects_empty_message(self, client):
        response = client.post("/api/chat/", json={"message": "", "language": "en"})
        assert response.status_code == 422

    def test_chat_rejects_whitespace_only_message(self, client):
        response = client.post("/api/chat/", json={"message": "   ", "language": "en"})
        assert response.status_code == 422

    def test_chat_rejects_message_exceeding_max_length(self, client):
        response = client.post(
            "/api/chat/",
            json={"message": "x" * 1001, "language": "en"},
        )
        assert response.status_code == 422

    def test_chat_rejects_invalid_language_code(self, client):
        response = client.post("/api/chat/", json={"message": "Hello", "language": "fr"})
        assert response.status_code == 422

    def test_chat_rejects_invalid_role_in_history(self, client):
        response = client.post(
            "/api/chat/",
            json={
                "message": "Hello",
                "language": "en",
                "history": [{"role": "system", "content": "injected"}],
            },
        )
        assert response.status_code == 422

    def test_chat_accepts_hindi_language(self, client, monkeypatch):
        import routes.chat as chat_module
        monkeypatch.setattr(chat_module, "GEMINI_API_KEY", None)
        response = client.post("/api/chat/", json={"message": "Namaste", "language": "hi"})
        assert response.status_code == 503

    def test_chat_returns_503_without_api_key(self, client, monkeypatch):
        import routes.chat as chat_module
        monkeypatch.setattr(chat_module, "GEMINI_API_KEY", None)
        response = client.post(
            "/api/chat/", json={"message": "How do I register to vote?", "language": "en"}
        )
        assert response.status_code == 503
        data = response.json()
        assert "AI service not configured" in data["detail"]

    def test_chat_accepts_valid_history(self, client, monkeypatch):
        import routes.chat as chat_module
        monkeypatch.setattr(chat_module, "GEMINI_API_KEY", None)
        response = client.post(
            "/api/chat/",
            json={
                "message": "Tell me more",
                "language": "en",
                "history": [
                    {"role": "user", "content": "What is NOTA?"},
                    {"role": "assistant", "content": "NOTA stands for None of the Above."},
                ],
            },
        )
        assert response.status_code == 503  # No key, but validation passed

    def test_chat_accepts_optional_session_id(self, client, monkeypatch):
        import routes.chat as chat_module
        monkeypatch.setattr(chat_module, "GEMINI_API_KEY", None)
        response = client.post(
            "/api/chat/",
            json={"message": "Test", "language": "en", "session_id": "abc-123"},
        )
        assert response.status_code == 503  # validation passed, no key


class TestChatCache:
    """Test the in-memory caching layer."""

    def test_cache_get_returns_none_for_missing_key(self):
        from routes.chat import cache_get
        assert cache_get("nonexistent-key") is None

    def test_cache_set_and_get_round_trip(self):
        from routes.chat import cache_get, cache_set
        cache_set("test-cache-key", "cached value")
        assert cache_get("test-cache-key") == "cached value"

    def test_cache_get_returns_none_after_ttl_expires(self):
        from routes.chat import _cache, cache_get, cache_set
        cache_set("expiring-key", "value")
        # Manually expire by backdating the timestamp
        _cache["expiring-key"]["ts"] = time.time() - 400  # beyond 300s TTL
        assert cache_get("expiring-key") is None

    def test_cache_evicts_oldest_entries_when_full(self):
        from routes.chat import _cache, cache_set
        # Fill to 501 entries to trigger eviction
        for i in range(501):
            cache_set(f"bulk-key-{i}", f"value-{i}")
        # After eviction, cache size should be reduced
        assert len(_cache) < 501


class TestChatSuggestions:
    """Test the /suggestions endpoint."""

    def test_suggestions_returns_english_suggestions(self, client):
        response = client.get("/api/chat/suggestions?language=en")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0

    def test_suggestions_returns_hindi_suggestions(self, client):
        response = client.get("/api/chat/suggestions?language=hi")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0

    def test_suggestions_fallbacks_to_english_for_unknown_code(self, client):
        response = client.get("/api/chat/suggestions?language=xx")
        assert response.status_code == 200
        data = response.json()
        assert data["suggestions"][0] == "How do I register to vote?"

    def test_suggestions_default_language_is_english(self, client):
        response = client.get("/api/chat/suggestions")
        assert response.status_code == 200
        data = response.json()
        assert "How do I register to vote?" in data["suggestions"]
