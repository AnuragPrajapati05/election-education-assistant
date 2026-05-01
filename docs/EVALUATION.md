# Evaluation Readiness

This document maps the repository to the hackathon evaluation categories.

## Code Quality

- React pages are organized by user workflow under `frontend/src/pages`.
- Shared context, Firebase, Gemini, and server helpers are separated from page code.
- FastAPI route logic is separated into `routes`, `middleware`, and pure eligibility helper functions.
- ESLint, Vitest, Pytest, and CI are configured.
- Source files use clean UTF-8/ASCII-safe text and avoid corrupted display strings.

## Security

- Secrets are excluded through `.gitignore` and documented with `.env.example` files.
- The frontend prefers the backend chat proxy when `VITE_API_BASE_URL` is configured, keeping Gemini credentials server-side.
- The production static server validates request paths before serving files.
- Backend APIs include rate limiting, validation, CORS allowlisting, and security headers.
- Firestore rules enforce ownership, admin-only analytics access, immutable chat messages, and immutable eligibility audit records.

## Efficiency

- Vite code splitting lazy-loads major pages.
- Gemini responses use short-lived in-memory caching.
- The production frontend is served as static assets from a small Node server.
- Cloud Run provides scalable hosting for the deployed frontend.

## Testing

- Backend: `pytest tests -v`
- Frontend lint: `npm run lint`
- Frontend unit tests: `npm run test`
- Production build: `npm run build`
- CI runs these checks on push and pull request.

## Accessibility

- Semantic navigation, main landmark, and skip-link support are present.
- Focus-visible styles and reduced-motion handling are included.
- High-contrast mode, keyboard-friendly controls, labels, and aria-live chat logs are implemented.

## Google Services

- Firebase Authentication
- Firestore
- Firebase Hosting/Functions configuration
- Google Gemini API
- Google Maps support for booth locator
- Google Cloud Run deployment

## Problem Statement Alignment

The project is explicitly focused on civic education for Indian voters: eligibility, registration, official process guidance, booth lookup, election timelines, FAQs, and neutral AI assistance. It avoids political persuasion and directs users to official ECI resources for final verification.
