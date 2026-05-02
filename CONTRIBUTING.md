# Contributing to Vote India – Election Education Assistant

Thank you for your interest in contributing! This document outlines the development workflow, coding standards, and submission process.

---

## Project Structure

```
election-assistant/
├── backend/          # FastAPI Python backend
│   ├── middleware/   # Auth & rate-limiting middleware
│   ├── routes/       # API route handlers
│   └── tests/        # pytest test suite
├── frontend/         # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── docs/             # Architecture & API documentation
└── firebase/         # Firestore security rules
```

---

## Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 20.x
- **Google Cloud CLI** (for deployment)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

---

## Coding Standards

### Python (Backend)

- Follow **PEP 8** and **PEP 257** for code and docstring style.
- Add **type hints** to all function signatures.
- Write **docstrings** for every public function, class, and module.
- All new endpoints must have corresponding **pytest** tests in `backend/tests/`.
- Use `from exc` chaining for `raise HTTPException(...)` inside `except` blocks.

### JavaScript / React (Frontend)

- Components should be **pure and focused** – one responsibility per file.
- Use `aria-*` attributes and semantic HTML for all interactive elements.
- Prefer `const` / arrow functions; avoid `var`.
- Add `aria-label` or `aria-labelledby` to all buttons without visible text.
- All user-facing strings should be routed through the `useLanguage()` hook.

---

## Running Tests

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

---

## Pull Request Guidelines

1. Branch from `main` with a descriptive name: `feature/booth-locator-real-api`.
2. Write tests for all new functionality.
3. Ensure `pytest` passes with zero failures before opening a PR.
4. Keep PRs focused – one feature or fix per PR.
5. Update `README.md` if you add new environment variables or change the setup process.

---

## Commit Message Format

```
type(scope): short description

feat(chat): add multi-language support for Tamil
fix(eligibility): correct age boundary calculation
docs(readme): update local setup instructions
test(middleware): add thread-safety test for rate limiter
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `style`
