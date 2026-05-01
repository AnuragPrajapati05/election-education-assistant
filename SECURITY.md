# Security Policy

## Secret Handling

Real Firebase, Gemini, Google Maps, and service-account credentials must stay out of git. The repository includes only `.env.example` templates. Production Gemini calls should go through the FastAPI `/api/chat/` proxy by setting `VITE_API_BASE_URL`, which keeps `GEMINI_API_KEY` server-side.

## Defensive Controls

- FastAPI validates request bodies with Pydantic.
- API responses include security headers.
- The static server blocks malformed paths and path traversal.
- Firestore rules restrict user records, chat messages, eligibility checks, analytics, and admin-only writes.
- Chat messages and eligibility checks are immutable audit records.
- Rate limiting protects backend endpoints from basic abuse.
- Assistant output is rendered as React text, not injected HTML.

## Reporting

For this hackathon submission, report issues by opening a GitHub issue in the public repository with reproduction steps and affected route or component.
