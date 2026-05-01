# Election Process Education Assistant

AI-powered civic education platform that helps Indian voters understand registration, eligibility, polling, and election workflows through a multilingual, accessible interface.

## Submission Links

- GitHub Repository: `https://github.com/AnuragPrajapati05/election-education-assistant`
- Live Demo: `https://vote-india-web-1057811226634.asia-south1.run.app`

## Chosen Vertical

This project is built for the **Civic Tech / Public Service** vertical.

The product focuses on voter education for Indian elections:

- explaining eligibility rules,
- guiding registration steps,
- helping users locate booths,
- answering election-process questions neutrally,
- improving accessibility for a broader citizen audience.

## Problem Statement Alignment

Many citizens, especially first-time voters, struggle with:

- understanding whether they are eligible to vote,
- knowing how to register or correct voter information,
- finding reliable booth and election-process information,
- navigating official workflows in a simple and accessible way.

This solution addresses those issues with a guided interface, AI assistance, and Google/Firebase-backed delivery infrastructure.

## Approach And Logic

The solution is designed around three principles:

1. **Trusted guidance over raw information**
   The app translates election rules and workflows into simple, step-by-step guidance instead of presenting users with complex policy text.

2. **Fast, low-friction voter support**
   Common tasks such as eligibility checking, booth lookup, registration walkthroughs, and FAQs are available directly from the dashboard without requiring users to navigate multiple portals.

3. **Accessible and deployable architecture**
   The frontend is optimized for responsive, keyboard-friendly, high-contrast usage, while backend and cloud integrations are structured for production deployment.

## How The Solution Works

### Frontend

The frontend is built with **React + Vite** and provides:

- dashboard for quick entry points,
- AI assistant for election education queries,
- eligibility checker,
- registration walkthrough,
- booth locator,
- calendar and timeline pages,
- accessible UI controls and language support.

Key frontend responsibilities:

- render the full user experience,
- integrate Firebase Auth and Firestore helpers,
- call Gemini for civic education responses,
- gracefully fall back to demo mode when cloud configuration is unavailable.

### Backend

The backend is built with **FastAPI** and provides:

- health endpoints,
- eligibility validation,
- analytics endpoints,
- booth search demo endpoints,
- server-side Gemini proxy route,
- request rate limiting,
- Firebase admin token verification hooks.

Key backend responsibilities:

- centralize validation logic,
- protect sensitive API-key-backed operations,
- provide API endpoints for extensibility and production hardening.

### Google Services Integration

This project meaningfully integrates Google services in multiple ways:

- **Firebase Authentication** for user sign-in,
- **Firestore** for user data, chat/session data, and analytics-oriented storage,
- **Firebase Hosting / Cloud-oriented deployment config** prepared in repo,
- **Google Gemini API** for multilingual election education responses,
- **Google Maps API** support for booth-locator embedding,
- **Cloud Run deployment path** prepared and used for the live demo.

## Architecture Summary

```text
User
  -> React/Vite Frontend
     -> Firebase Auth / Firestore
     -> Gemini API (frontend demo mode path)
     -> FastAPI Backend (/api/*)
        -> validation + rate limiting
        -> Gemini proxy route
        -> Firebase Admin verification hooks
```

## Project Structure

```text
election-assistant/
|- frontend/
|  |- src/
|  |  |- components/
|  |  |- context/
|  |  |- pages/
|  |  |- services/
|  |  |- App.jsx
|  |  |- main.jsx
|  |  `- index.css
|  |- .env.example
|  |- Dockerfile
|  |- package.json
|  `- vite.config.js
|- backend/
|  |- main.py
|  |- middleware/
|  |- routes/
|  |- tests/
|  `- requirements.txt
|- firebase/
|  |- firebase.json
|  |- firestore.rules
|  `- functions/
`- README.md
```

## Key Features

- AI election education assistant
- voter eligibility checker
- voter registration walkthrough
- polling booth locator
- election timeline and calendar
- Firebase authentication support
- multilingual UI support
- accessibility-focused UI
- analytics and admin scaffolding

## Assumptions Made

- Users primarily need **process education**, not political recommendations.
- Election answers must remain **politically neutral**.
- Official public information may change, so the system should guide users back to official ECI portals for final verification.
- Booth lookup and analytics routes currently use demo/mock-backed logic where production integrations are not yet connected.
- Some features are designed to degrade gracefully when credentials are absent, so judges can still evaluate the user experience locally.

## Security Decisions

- environment variables are excluded from git,
- example environment files are provided without real secrets,
- Firebase service-account keys are excluded from git,
- backend secrets are intended to stay server-side,
- rate limiting is implemented in the FastAPI middleware,
- input validation is handled with Pydantic models,
- backend responses include defensive security headers,
- the production static server rejects malformed paths and path traversal attempts,
- assistant responses are rendered as safe React text instead of injected HTML,
- Firebase admin verification hooks are included for protected flows,
- production deployment is separated from local developer configuration.

## Accessibility Decisions

- high-contrast mode support,
- keyboard-friendly navigation,
- skip-link support for keyboard and screen-reader users,
- visible focus states,
- reduced-motion support for users who prefer less animation,
- semantic navigation structure,
- readable spacing and typography,
- responsive layouts for smaller screens,
- simplified wording for public-service usability,
- language switching support.

## Efficiency Decisions

- Vite-based frontend build for fast bundling,
- lazy loading of major frontend pages,
- in-memory caching for Gemini responses,
- compact mock/data responses for common flows,
- Docker-based production packaging for repeatable deployments,
- Cloud Run deployment for scalable hosting.

## Testing Strategy

The codebase includes automated validation for both backend logic and critical user-facing behavior.

Continuous integration is included in `.github/workflows/ci.yml` and runs backend tests, frontend linting, frontend tests, and the production build on every push or pull request.

### Backend testing

Backend tests cover:

- health and root endpoints,
- eligibility endpoint success and validation failures,
- booth search success and invalid input handling,
- analytics route availability,
- chat route suggestions,
- chat validation and missing-service handling,
- response security headers,
- rate-limiter smoke behavior.

### Frontend testing

Frontend tests are used to validate:

- Gemini fallback and cache behavior,
- Gemini prompt normalization and live-response parsing,
- static-server path safety,
- production/server helper behavior,
- utility-level logic that is important for stable UX.

### Manual verification

Manual validation was also performed for:

- local frontend startup,
- backend startup,
- Cloud Run deployment packaging,
- responsive UI checks,
- deployed URL accessibility.

## How To Run Locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase project
- Gemini API key

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Tests

```bash
cd backend
pytest tests -v

cd ../frontend
npm run lint
npm run test
npm run build
```

## Environment Variables

### Frontend

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_KEY=
VITE_API_BASE_URL=
```

### Backend

```bash
GEMINI_API_KEY=
FIREBASE_CREDENTIALS_PATH=
GOOGLE_MAPS_API_KEY=
PORT=8000
```

## Deployment Notes

This repository includes deployment-ready support for:

- Firebase-related configuration in `firebase/`,
- Docker-based frontend packaging,
- Cloud Run deployment for the frontend,
- production static serving through `frontend/server.js`.

## Limitations And Future Improvements

- booth data is currently demo-backed rather than live ECI-integrated,
- backend auth protection is scaffolded but not fully wired across all routes,
- frontend Gemini calls can be moved fully behind backend proxying for stricter production security,
- more browser-level UI tests can be added for full end-to-end regression coverage,
- Firestore analytics flows can be extended into fully live dashboards.

## Why This Submission Is Strong

- clear civic-tech alignment,
- meaningful Google service integration,
- production-minded deployment path,
- secure handling of secrets in repository structure,
- accessible and polished user interface,
- maintainable code organization across frontend, backend, and cloud config.

## License

MIT License.

Built for civic education purposes and not affiliated with the Election Commission of India.
