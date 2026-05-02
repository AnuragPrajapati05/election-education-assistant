# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |

---

## Secret Handling

Real Firebase, Gemini, Google Maps, and service-account credentials must **never** be committed to git.

- The repository ships only `.env.example` templates with placeholder values.
- All AI requests are proxied through `POST /api/chat/` (FastAPI backend), keeping `GEMINI_API_KEY` strictly server-side.
- On Cloud Run, secrets are stored in **Google Secret Manager** and injected as environment variables at runtime.
- Local development uses `.env` / `.env.local` files that are listed in `.gitignore`.

---

## Defensive Controls

### HTTP Security Headers (all responses)

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Restricts scripts, styles, images, and connections to trusted origins |
| `X-Content-Type-Options` | `nosniff` – prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` – blocks clickjacking via iframes |
| `X-XSS-Protection` | `1; mode=block` – legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disables camera, microphone, and payment APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |

### API Security

- **Input validation** – all request bodies validated by Pydantic v2 models with strict field constraints.
- **Rate limiting** – sliding-window per-IP limiter (60 req/min default); returns `429` with `Retry-After` header.
- **CORS** – restricted to an explicit allowlist of origins; credentials flag enabled only for trusted frontends.
- **Firebase Auth** – ID tokens verified server-side via Firebase Admin SDK; expired/invalid tokens return `401`.
- **Path traversal** – the production static server rejects any request path containing `..` or percent-encoded traversal sequences.

### Frontend Security

- **No `dangerouslySetInnerHTML`** – all AI response text is rendered as React text nodes, never injected HTML.
- **Content Security Policy** – defined in the backend response headers and echoed in the Vite build.
- **Firebase Firestore rules** – user records, chat messages, eligibility checks, and analytics events are access-controlled per UID; admin-only writes are enforced server-side.

### Data Integrity

- Chat messages and eligibility checks stored in Firestore are append-only audit records (no client-side delete).

---

## Known Limitations

- The booth locator currently returns demo/mock data; real ECI API integration would require additional auth handling.
- The in-memory rate limiter resets on container restart. For multi-replica deployments, use Redis-backed rate limiting.

---

## Reporting a Vulnerability

For this hackathon submission, report security issues by opening a **GitHub Issue** in the public repository with:

1. A clear description of the vulnerability.
2. Steps to reproduce.
3. The affected route or component.
4. Any suggested remediation.

We aim to acknowledge reports within **48 hours** and patch critical issues within **7 days**.
