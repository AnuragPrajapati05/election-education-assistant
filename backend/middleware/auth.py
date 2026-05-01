# backend/middleware/auth.py
"""
Firebase token verification middleware.
"""
import os
import logging
from fastapi import HTTPException, Header
from typing import Optional
import firebase_admin
from firebase_admin import auth, credentials

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK once
_initialized = False

def init_firebase():
    global _initialized
    if _initialized:
        return
    try:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_path:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Use Application Default Credentials (Cloud Run / GCP)
            firebase_admin.initialize_app()
        _initialized = True
        logger.info("Firebase Admin SDK initialized")
    except Exception as e:
        logger.warning(f"Firebase Admin not initialized: {e}. Auth verification disabled.")


def verify_firebase_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify Firebase ID token from Authorization header.
    Returns decoded token payload with uid, email, role.
    """
    init_firebase()

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format. Use 'Bearer <token>'")

    token = authorization[7:]
    try:
        decoded = auth.verify_id_token(token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
            "role": decoded.get("role", "user"),
        }
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired. Please re-login.")
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed.")


def require_admin(token_data: dict = None):
    if not token_data or token_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return token_data
