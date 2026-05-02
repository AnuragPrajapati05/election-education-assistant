"""Firebase Admin SDK token verification middleware.

Provides a FastAPI dependency (:func:`verify_firebase_token`) that validates
Firebase ID tokens from the ``Authorization: Bearer <token>`` header, and a
helper (:func:`require_admin`) that restricts access to admin-role users.

The Firebase Admin SDK is initialized lazily on first use.  When deployed on
Cloud Run with the service account that owns the Firebase project, no
``FIREBASE_CREDENTIALS_PATH`` is needed – the SDK uses Application Default
Credentials automatically.
"""

import logging
import os
from typing import Optional

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth, credentials

logger = logging.getLogger(__name__)

_initialized: bool = False


def init_firebase() -> None:
    """Initialize the Firebase Admin SDK (idempotent).

    Reads ``FIREBASE_CREDENTIALS_PATH`` from the environment to locate a
    service-account JSON key.  Falls back to Application Default Credentials
    (ADC) when the variable is unset – the recommended approach for Cloud Run.

    Failures are logged as warnings rather than raised, which allows the
    application to start even when Firebase is not configured (auth will then
    return 401 on every request).
    """
    global _initialized
    if _initialized:
        return
    try:
        cred_path: Optional[str] = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_path:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Use Application Default Credentials on Cloud Run / GCP
            firebase_admin.initialize_app()
        _initialized = True
        logger.info("Firebase Admin SDK initialized successfully.")
    except Exception as exc:  # pylint: disable=broad-except
        logger.warning("Firebase Admin SDK not initialized: %s. Auth verification disabled.", exc)


def verify_firebase_token(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency: verify a Firebase ID token from the Authorization header.

    Expected header format::

        Authorization: Bearer <firebase-id-token>

    Args:
        authorization: Raw value of the ``Authorization`` HTTP header.

    Returns:
        dict: Decoded token payload with keys ``uid``, ``email``, and ``role``.

    Raises:
        HTTPException 401: When the header is missing, malformed, expired, or invalid.
    """
    init_firebase()

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format. Expected: 'Bearer <token>'.",
        )

    token: str = authorization[7:]
    try:
        decoded = auth.verify_id_token(token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
            "role": decoded.get("role", "user"),
        }
    except auth.ExpiredIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Token expired. Please sign in again.") from exc
    except auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token.") from exc
    except Exception as exc:  # pylint: disable=broad-except
        logger.error("Token verification error: %s", exc)
        raise HTTPException(status_code=401, detail="Authentication failed.") from exc


def require_admin(token_data: Optional[dict] = None) -> dict:
    """Raise HTTP 403 unless *token_data* carries the ``admin`` role.

    Args:
        token_data: Decoded token dict returned by :func:`verify_firebase_token`.

    Returns:
        The unchanged *token_data* dict if the role check passes.

    Raises:
        HTTPException 403: When the role is not ``admin``.
    """
    if not token_data or token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return token_data
