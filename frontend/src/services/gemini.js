// src/services/gemini.js
// Gemini API integration with response caching

const GEMINI_MODEL = "gemini-2.0-flash";
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simple in-memory cache to reduce API calls
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const SYSTEM_PROMPT = {
  en: `You are the Election Process Education Assistant for India, a knowledgeable and friendly civic educator.
Your role is to help citizens understand:
- Voter registration steps and required documents
- Eligibility criteria (age, citizenship, residence)
- Election schedules and important dates
- Types of elections (Lok Sabha, Vidhan Sabha, local body)
- The EVM (Electronic Voting Machine) process
- How to find polling booths
- NOTA and other voter rights
- Election Commission of India procedures

Guidelines:
- Keep responses concise and clear (2-4 short paragraphs max)
- Use simple, accessible language
- Provide step-by-step guidance when asked
- Include relevant Indian election law references when applicable
- Be politically neutral and never endorse any party or candidate
- Format key steps as numbered lists when appropriate
- If asked about something outside elections/civic education, politely redirect`,

  hi: `You are an Indian election education assistant.
Respond in simple Hinglish/Hindi transliteration.
Help users with voter registration, eligibility, required documents, EVM, NOTA, polling booths, and official ECI processes.
Stay politically neutral and redirect non-election questions politely.`,
};

const DEMO_RESPONSES = {
  en: [
    "To register as a voter in India, you need to **fill Form 6** on the **National Voters' Service Portal (NVSP)** at voters.eci.gov.in. You'll need proof of age, proof of residence, and a passport-size photo. The process takes about 2-3 weeks after submission.",
    "The **eligibility criteria** for voting in India are:\n1. Must be a citizen of India\n2. Must be at least **18 years old** as of January 1st of the qualifying year\n3. Must be ordinarily resident of the constituency where you wish to register\n4. Must not be of unsound mind or disqualified under any law",
    "India uses **Electronic Voting Machines (EVMs)** since 2004. On election day:\n1. Bring your **Voter ID card** (EPIC) to your assigned polling booth\n2. Show it to the polling officer\n3. Get your finger marked with indelible ink\n4. Press the button next to your preferred candidate\n\nYou can also use **VVPAT** (Voter Verifiable Paper Audit Trail) to verify your vote.",
  ],
  hi: [
    "Voter registration ke liye **voters.eci.gov.in** par **Form 6** fill karein. Aapko age proof, residence proof, aur passport-size photo chahiye. Submission ke baad verification usually 2-3 weeks leta hai.",
  ],
};

export function getGeminiApiKey() {
  if (typeof globalThis !== "undefined" && "__TEST_GEMINI_API_KEY__" in globalThis) {
    return globalThis.__TEST_GEMINI_API_KEY__;
  }
  return import.meta.env.VITE_GEMINI_API_KEY;
}

export function getApiBaseUrl() {
  if (typeof globalThis !== "undefined" && "__TEST_API_BASE_URL__" in globalThis) {
    return globalThis.__TEST_API_BASE_URL__;
  }
  return import.meta.env.VITE_API_BASE_URL || "";
}

export function normalizeLanguage(language = "en") {
  return ["en", "hi"].includes(language) ? language : "en";
}

export function normalizePrompt(userMessage) {
  return String(userMessage || "").trim().slice(0, 1000);
}

export function buildCacheKey(userMessage, language = "en") {
  return `${normalizeLanguage(language)}::${normalizePrompt(userMessage).toLowerCase().slice(0, 80)}`;
}

export function isDemoMode(apiKey = getGeminiApiKey()) {
  return !apiKey || apiKey === "your_gemini_api_key_here";
}

async function askBackendChat(prompt, language, conversationHistory) {
  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, "");
  if (!apiBaseUrl) return null;

  const response = await fetch(`${apiBaseUrl}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: prompt,
      language,
      history: conversationHistory.slice(-6).filter((m) => normalizePrompt(m?.content)),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || `Backend chat error: ${response.status}`);
  }

  const data = await response.json();
  return data.response;
}

export async function askGemini(userMessage, language = "en", conversationHistory = []) {
  const apiKey = getGeminiApiKey();
  const activeLanguage = normalizeLanguage(language);
  const prompt = normalizePrompt(userMessage);
  if (!prompt) {
    throw new Error("Message cannot be empty.");
  }

  const cacheKey = buildCacheKey(prompt, activeLanguage);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }

  const backendResponse = await askBackendChat(prompt, activeLanguage, conversationHistory);
  if (backendResponse) {
    responseCache.set(cacheKey, { text: backendResponse, timestamp: Date.now() });
    return backendResponse;
  }

  if (isDemoMode(apiKey)) {
    await sleep(800 + Math.random() * 600);
    const pool = DEMO_RESPONSES[activeLanguage] || DEMO_RESPONSES.en;
    const text = pool[Math.floor(Math.random() * pool.length)];
    responseCache.set(cacheKey, { text, timestamp: Date.now() });
    return text;
  }

  // Build messages array
  const messages = [
    // System context as first user turn
    {
      role: "user",
      parts: [{ text: `SYSTEM: ${SYSTEM_PROMPT[activeLanguage] || SYSTEM_PROMPT.en}` }],
    },
    { role: "model", parts: [{ text: "Understood. I'm ready to help citizens with election education." }] },
    // Conversation history (last 6 turns)
    ...conversationHistory.slice(-6).filter((m) => normalizePrompt(m?.content)).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: normalizePrompt(m.content) }],
    })),
    // Current message
    { role: "user", parts: [{ text: prompt }] },
  ];

  const response = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        stopSequences: [],
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response. Please try again.";

  // Cache the response
  responseCache.set(cacheKey, { text, timestamp: Date.now() });
  return text;
}

export function clearCache() {
  responseCache.clear();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
