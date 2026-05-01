// src/pages/AssistantPage.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { askGemini } from "../services/gemini";
import { saveChatMessage, trackEvent } from "../services/firebase";

const SUGGESTED_QUESTIONS = {
  en: [
    "How do I register to vote for the first time?",
    "What is the minimum age to vote in India?",
    "What documents are needed for voter registration?",
    "How does the Electronic Voting Machine work?",
    "What is NOTA and how do I use it?",
    "How to find my polling booth?",
  ],
  hi: [
    "पहली बार मतदाता के रूप में पंजीकरण कैसे करें?",
    "भारत में मतदान की न्यूनतम आयु क्या है?",
    "EVM कैसे काम करती है?",
    "NOTA क्या है?",
  ],
};

function formatMessage(text) {
  // Simple markdown-ish formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n(\d+\.\s)/g, "<br/>$1")
    .replace(/\n/g, "<br/>");
}

function Message({ msg }) {
  return (
    <div
      className="message-bubble"
      role={msg.role === "user" ? "none" : "article"}
      aria-label={msg.role === "assistant" ? "Assistant response" : undefined}
      style={{
        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
        maxWidth: msg.role === "user" ? "68%" : "80%",
      }}
    >
      {msg.role === "assistant" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "var(--gradient-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}
          >🤖</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI Assistant
          </span>
        </div>
      )}
      {msg.loading ? (
        <div className="typing-dots" aria-label="Loading response">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      ) : (
        <div
          style={{ fontSize: 14, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
        />
      )}
      {!msg.loading && (
        <div style={{ fontSize: 11, color: msg.role === "user" ? "rgba(255,255,255,0.6)" : "var(--text-muted)", marginTop: 6, textAlign: msg.role === "user" ? "right" : "left" }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

const SESSION_ID = `session-${Date.now()}`;

export default function AssistantPage() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 0, role: "assistant", loading: false,
      timestamp: Date.now(),
      content: language === "hi"
        ? "नमस्ते! मैं आपका चुनाव शिक्षा सहायक हूं। मतदाता पंजीकरण, पात्रता, चुनाव प्रक्रिया — कुछ भी पूछें!"
        : "Hello! I'm your Election Education Assistant 🗳️\n\nI can help you with:\n- **Voter registration** steps and requirements\n- **Eligibility** criteria and verification\n- **Election process** and important dates\n- **Polling booth** information\n- **Documents** needed for voting\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionMsgs, setSessionMsgs] = useState([]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { id: Date.now(), role: "user", content: userText, timestamp: Date.now() };
    const loadingMsg = { id: Date.now() + 1, role: "assistant", loading: true, timestamp: Date.now() };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    const updatedHistory = [...sessionMsgs, { role: "user", content: userText }];

    try {
      const response = await askGemini(userText, language, updatedHistory);
      const assistantMsg = { id: Date.now() + 2, role: "assistant", content: response, loading: false, timestamp: Date.now() };

      setMessages((prev) => prev.filter((m) => !m.loading).concat(assistantMsg));
      setSessionMsgs([...updatedHistory, { role: "assistant", content: response }]);

      // Save to Firestore
      if (user) {
        await saveChatMessage(user.uid, SESSION_ID, userMsg).catch(console.warn);
        await saveChatMessage(user.uid, SESSION_ID, assistantMsg).catch(console.warn);
      }

      trackEvent("chat_message", { language, question_length: userText.length });
    } catch (err) {
      const errMsg = {
        id: Date.now() + 3,
        role: "assistant",
        loading: false,
        timestamp: Date.now(),
        content: "I'm sorry, I encountered an error. Please check your API configuration or try again.",
      };
      setMessages((prev) => prev.filter((m) => !m.loading).concat(errMsg));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, language, sessionMsgs, user]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="page-header" style={{ marginBottom: 0, flexShrink: 0 }}>
        <h1 className="page-title">🤖 {t("assistant")}</h1>
        <p className="page-subtitle">Powered by Google Gemini AI — Ask anything about Indian elections</p>
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          {(SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS.en).map((q, i) => (
            <button
              key={i}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => sendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-container" style={{ flex: 1 }}>
        <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            className="form-textarea"
            placeholder={t("ask_anything")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ flex: 1, minHeight: 42, maxHeight: 120, resize: "none", padding: "10px 14px" }}
            aria-label="Message input"
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{ flexShrink: 0 }}
          >
            {loading ? (
              <span style={{ display: "flex", gap: 3 }}>
                <span className="typing-dot" style={{ width: 5, height: 5 }} />
                <span className="typing-dot" style={{ width: 5, height: 5, animationDelay: "0.2s" }} />
              </span>
            ) : "→"}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        AI responses are for educational purposes. For official information, visit{" "}
        <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)" }}>
          voters.eci.gov.in
        </a>
      </div>
    </div>
  );
}
