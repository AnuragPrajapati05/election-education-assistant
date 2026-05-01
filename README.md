# 🗳️ Election Process Education Assistant

**A production-ready, AI-powered civic education platform for Indian election processes.**

Built for hackathons, civic tech initiatives, and government education portals. Features conversational AI, eligibility checking, voter registration walkthroughs, polling booth locator, multilingual support, and analytics dashboards.

---

## 📦 Project Structure

```
election-assistant/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── AuthModal.jsx    # Firebase authentication modal
│   │   │   ├── LoadingScreen.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── context/             # React context providers
│   │   │   ├── AuthContext.jsx  # Firebase auth state
│   │   │   └── LanguageContext.jsx  # i18n + accessibility
│   │   ├── pages/               # Route-level page components
│   │   │   ├── Dashboard.jsx    # Stats and quick actions
│   │   │   ├── AssistantPage.jsx # Gemini AI chat
│   │   │   ├── EligibilityPage.jsx # Voter eligibility checker
│   │   │   ├── RegistrationPage.jsx # Form 6 walkthrough
│   │   │   ├── TimelinePage.jsx # Election timeline + steps
│   │   │   ├── CalendarPage.jsx # Interactive event calendar
│   │   │   ├── BoothLocatorPage.jsx # Google Maps booth finder
│   │   │   ├── FAQPage.jsx      # Searchable FAQ accordion
│   │   │   └── AdminPage.jsx    # Analytics dashboard (admin)
│   │   ├── services/
│   │   │   ├── firebase.js      # Firebase Auth + Firestore helpers
│   │   │   └── gemini.js        # Gemini API client + caching
│   │   ├── App.jsx              # Root component + routing
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Global styles + design system
│   ├── .env.example             # Environment variable template
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # FastAPI Python backend
│   ├── main.py                  # App setup + middleware
│   ├── routes/
│   │   ├── chat.py              # Gemini proxy + caching
│   │   └── eligibility.py       # Eligibility logic + analytics/users/booths
│   ├── middleware/
│   │   ├── auth.py              # Firebase token verification
│   │   └── rate_limit.py        # Sliding window rate limiter
│   ├── tests/
│   │   └── test_eligibility.py  # Unit + integration tests
│   ├── requirements.txt
│   └── .env.example
│
├── firebase/
│   ├── firestore.rules          # Security rules
│   ├── firebase.json            # Hosting + functions config
│   └── functions/
│       └── index.js             # Cloud Functions (analytics, notifications)
│
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Firebase** account (free tier works)
- **Google AI Studio** account (for Gemini API key — free tier available)

---

## 1️⃣ Clone & Install

```bash
git clone <your-repo-url>
cd election-assistant

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```

---

## 2️⃣ Firebase Setup

### Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → Name it (e.g., `election-education`)
3. Enable Google Analytics → Continue

### Enable Authentication

1. Firebase Console → **Authentication** → **Get Started**
2. **Sign-in method** tab → Enable:
   - ✅ **Email/Password**
   - ✅ **Google**

### Enable Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Start in **production mode** (we have rules)
3. Choose a region (e.g., `asia-south1` for India)

### Get Web App Credentials

1. Firebase Console → **Project Settings** → **General** tab
2. Scroll to **"Your apps"** → Click **"Add app"** → Web (</> icon)
3. Register app → Copy the `firebaseConfig` object values

### Set Up Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# In the firebase/ directory
cd firebase
firebase init

# Deploy rules
firebase deploy --only firestore:rules
```

---

## 3️⃣ Get API Keys

### Gemini API Key (Free)

1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Click **"Create API key"**
3. Copy the key

### Google Maps API Key (Optional — for live maps)

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create credentials → **API key**
3. Enable these APIs:
   - Maps Embed API
   - Maps JavaScript API
   - Places API
4. Restrict key to your domain in production

---

## 4️⃣ Configure Environment Variables

### Frontend

```bash
cd frontend
cp .env.example .env.local

# Edit .env.local with your values:
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GOOGLE_MAPS_KEY=AIzaSy...   # Optional
```

### Backend

```bash
cd backend
cp .env.example .env

# Edit .env:
GEMINI_API_KEY=AIzaSy...
FIREBASE_CREDENTIALS_PATH=../firebase/serviceAccountKey.json
```

### Firebase Service Account (for backend)

1. Firebase Console → **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"** → Download JSON
3. Save as `firebase/serviceAccountKey.json`
4. ⚠️ **Never commit this file to git** (it's in .gitignore)

---

## 5️⃣ Run Locally

### Start Frontend

```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

### Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
# API docs at http://localhost:8000/api/docs
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## 6️⃣ Deploy to Production

### Option A: Firebase Hosting (Frontend) + Cloud Run (Backend)

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase Hosting
cd ../firebase
firebase deploy --only hosting

# Backend to Cloud Run
cd ../backend
gcloud run deploy election-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

### Option B: Vercel (Frontend) + Railway (Backend)

```bash
# Frontend → vercel.com → import repo → set env vars
# Backend → railway.app → deploy from GitHub → set env vars
```

### Option C: Full Firebase (recommended)

```bash
# Deploy everything
cd firebase
firebase deploy
# Deploys: Hosting + Functions + Firestore Rules
```

---

## 🌐 Features Overview

| Feature | Status | Notes |
|---------|--------|-------|
| 🤖 Gemini AI Chat | ✅ | Multilingual, cached responses |
| ✅ Eligibility Checker | ✅ | Age, citizenship, state logic |
| 📝 Registration Walkthrough | ✅ | 4-step Form 6 guide |
| 📅 Election Timeline | ✅ | Interactive phase explorer |
| 🗓️ Election Calendar | ✅ | 2025 events, clickable |
| 📍 Booth Locator | ✅ | Canvas demo + real Maps API |
| ❓ FAQ Accordion | ✅ | Searchable, categorized |
| 🔐 Firebase Auth | ✅ | Email + Google OAuth |
| 🌍 Hindi Support | ✅ | UI + AI responses |
| ♿ Accessibility | ✅ | WCAG contrast, ARIA, voice |
| ⚙️ Admin Dashboard | ✅ | Analytics + activity feed |
| 🔒 Security Rules | ✅ | Firestore rules + rate limiting |
| ☁️ Cloud Functions | ✅ | Analytics triggers + cron |

---

## 🔒 Security Notes

- **Never commit** `.env`, `.env.local`, or `serviceAccountKey.json`
- Firestore Security Rules restrict data access by user role
- Backend API keys are kept server-side (never exposed to browser)
- Frontend Gemini calls can be proxied through backend for production
- Rate limiter prevents API abuse (60 req/min per IP)
- Input validation on all API endpoints with Pydantic

---

## ♿ Accessibility

- All interactive elements have ARIA labels
- High contrast mode toggle (WCAG AAA)
- Keyboard navigation supported throughout
- Screen reader announcements for dynamic content (`aria-live`)
- Voice readout via Web Speech API (toggle in navbar)
- Font size controls (sm/md/lg)

---

## 📞 Support & Resources

- **ECI Official**: [eci.gov.in](https://eci.gov.in)
- **Voter Registration**: [voters.eci.gov.in](https://voters.eci.gov.in)
- **Voter Helpline**: **1950**
- **Electoral Search**: [electoralsearch.eci.gov.in](https://electoralsearch.eci.gov.in)

---

## 📄 License

MIT License. Built for civic education purposes. Not affiliated with the Election Commission of India.
