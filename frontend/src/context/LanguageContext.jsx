// src/context/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

export const LANGUAGES = {
  en: { code: "en", name: "English", flag: "🇬🇧" },
  hi: { code: "hi", name: "हिंदी", flag: "🇮🇳" },
};

export const t = (key, lang, params = {}) => {
  const tr = TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  return typeof tr === "string"
    ? tr.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
    : tr;
};

const TRANSLATIONS = {
  en: {
    dashboard: "Dashboard",
    assistant: "AI Assistant",
    registration: "Voter Registration",
    eligibility: "Eligibility Checker",
    timeline: "Election Timeline",
    calendar: "Election Calendar",
    booth: "Booth Locator",
    faq: "FAQ",
    admin: "Admin",
    welcome: "Welcome to Election Education Hub",
    welcome_sub: "Your trusted guide to understanding the democratic process",
    ask_anything: "Ask anything about elections...",
    send: "Send",
    language: "Language",
    high_contrast: "High Contrast",
    voice_mode: "Voice Mode",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    check_eligibility: "Check My Eligibility",
    find_booth: "Find My Booth",
    register_now: "Register to Vote",
    total_users: "Registered Users",
    chat_sessions: "Chat Sessions",
    eligible_voters: "Eligible Voters",
    recent_queries: "Recent Queries",
    next_election: "Next Election",
    days_away: "{days} days away",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    assistant: "AI सहायक",
    registration: "मतदाता पंजीकरण",
    eligibility: "पात्रता जांच",
    timeline: "चुनाव समयरेखा",
    calendar: "चुनाव कैलेंडर",
    booth: "बूथ लोकेटर",
    faq: "अक्सर पूछे जाने वाले प्रश्न",
    admin: "व्यवस्थापक",
    welcome: "चुनाव शिक्षा केंद्र में आपका स्वागत है",
    welcome_sub: "लोकतांत्रिक प्रक्रिया को समझने का आपका विश्वसनीय मार्गदर्शक",
    ask_anything: "चुनाव के बारे में कुछ भी पूछें...",
    send: "भेजें",
    language: "भाषा",
    high_contrast: "उच्च कंट्रास्ट",
    voice_mode: "वॉयस मोड",
    login: "लॉगिन",
    signup: "साइन अप",
    logout: "लॉगआउट",
    check_eligibility: "पात्रता जांचें",
    find_booth: "बूथ खोजें",
    register_now: "मतदान के लिए पंजीकरण करें",
    total_users: "पंजीकृत उपयोगकर्ता",
    chat_sessions: "चैट सत्र",
    eligible_voters: "पात्र मतदाता",
    recent_queries: "हाल की पूछताछ",
    next_election: "अगला चुनाव",
    days_away: "{days} दिन बाद",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (k, p) => t(k, language, p) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);



