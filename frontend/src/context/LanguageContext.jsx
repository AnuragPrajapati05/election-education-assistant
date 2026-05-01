// src/context/LanguageContext.jsx
import { createContext, useContext, useState } from "react";

const LanguageContext = createContext(null);

export const LANGUAGES = {
  en: { code: "en", name: "English", flag: "EN" },
  hi: { code: "hi", name: "Hindi", flag: "HI" },
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
    dashboard: "Dashboard",
    assistant: "AI Sahayak",
    registration: "Voter Registration",
    eligibility: "Eligibility Check",
    timeline: "Election Timeline",
    calendar: "Election Calendar",
    booth: "Booth Locator",
    faq: "FAQ",
    admin: "Admin",
    welcome: "Election Education Hub mein swagat hai",
    welcome_sub: "Loktantrik prakriya samajhne ke liye trusted guide",
    ask_anything: "Election ke baare mein kuch bhi poochhein...",
    send: "Send",
    language: "Language",
    high_contrast: "High Contrast",
    voice_mode: "Voice Mode",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    check_eligibility: "Check Eligibility",
    find_booth: "Find Booth",
    register_now: "Register to Vote",
    total_users: "Registered Users",
    chat_sessions: "Chat Sessions",
    eligible_voters: "Eligible Voters",
    recent_queries: "Recent Queries",
    next_election: "Next Election",
    days_away: "{days} days away",
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
