import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../services/firebase";

const STATS = [
  { key: "total_users", value: "94.5Cr", icon: "People", change: "+2.3%", up: true },
  { key: "chat_sessions", value: "3,891", icon: "Chat", change: "+18%", up: true },
  { key: "eligible_voters", value: "96.8Cr", icon: "Ready", change: "+1.1%", up: true },
  { key: "next_election", value: "120", icon: "Days", suffix: "days", change: null },
];

const QUICK_ACTIONS = [
  {
    id: "assistant", icon: "AI", title: "Ask AI Assistant",
    desc: "Get instant answers about elections", color: "#0f172a",
  },
  {
    id: "eligibility", icon: "Check", title: "Check Eligibility",
    desc: "Verify if you can vote", color: "#ff7a00",
  },
  {
    id: "registration", icon: "Register", title: "Register to Vote",
    desc: "Step-by-step guide", color: "#2563eb",
  },
  {
    id: "booth", icon: "Locate", title: "Find Polling Booth",
    desc: "Locate your nearest booth", color: "#16a34a",
  },
];

const RECENT_QUERIES = [
  "How do I check my name on the voter list?",
  "What documents are needed to vote for the first time?",
  "Can I vote if I moved to a new city?",
  "What is NOTA and when can I use it?",
  "How to correct mistakes in my voter ID?",
];

const ELECTION_UPDATES = [
  { date: "Mar 2025", event: "Bihar Legislative Assembly Elections", status: "upcoming", type: "state" },
  { date: "Apr 2025", event: "West Bengal Panchayat Elections", status: "upcoming", type: "local" },
  { date: "Jun 2025", event: "Voter Roll Revision - Special Campaign", status: "ongoing", type: "admin" },
];

export default function Dashboard({ onNavigate }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    trackEvent("page_view", { page: "dashboard" });
  }, []);

  return (
    <div className="dashboard-shell">
      <section className="dashboard-hero animate-in">
        <div className="dashboard-hero-copy">
          <div className="dashboard-eyebrow">Election Commission of India - Civic Education Platform</div>
          <h1 className="dashboard-title">
            {user ? `Welcome back, ${user.displayName?.split(" ")[0] || "Citizen"}` : t("welcome")}
            <span className="dashboard-title-accent"> vote with clarity.</span>
          </h1>
          <p className="dashboard-description">{t("welcome_sub")}</p>
          <div className="dashboard-hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate("assistant")}>
              Ask AI Assistant
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigate("registration")}>
              Register to Vote
            </button>
          </div>
        </div>

        <div className="dashboard-hero-panel glass-card-strong">
          <div className="hero-panel-label">Live Voter Guide</div>
          <div className="hero-panel-stats">
            <div>
              <div className="hero-panel-value">120</div>
              <div className="hero-panel-meta">days to next major election</div>
            </div>
            <div>
              <div className="hero-panel-value">96.8Cr</div>
              <div className="hero-panel-meta">eligible voters supported</div>
            </div>
          </div>
          <div className="hero-panel-list">
            {[
              "Registration guidance available",
              "Booth locator ready",
              "Neutral civic education assistant active",
            ].map((item) => (
              <div key={item} className="hero-panel-list-item">
                <span className="hero-panel-bullet" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary hero-panel-button" onClick={() => onNavigate("booth")}>
            Find your booth
          </button>
        </div>
      </section>

      <section className="grid-4 dashboard-stats">
        {STATS.map((stat, i) => (
          <div
            key={stat.key}
            className="glass-card stat-card animate-in dashboard-stat-card"
            style={{ animationDelay: `${i * 0.08}s`, opacity: 0, animationFillMode: "forwards" }}
          >
            <div className="dashboard-stat-icon">{stat.icon}</div>
            <div className="stat-value">
              {stat.value}
              {stat.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}> {stat.suffix}</span>}
            </div>
            <div className="stat-label">{t(stat.key)}</div>
            {stat.change && (
              <div className={`stat-change ${stat.up ? "up" : "down"}`}>
                {stat.up ? "Up" : "Down"} {stat.change}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="grid-2 dashboard-panels">
        <div>
          <h2 className="dashboard-section-title">Quick Actions</h2>
          <div className="grid-2" style={{ gap: 14 }}>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                className="glass-card dashboard-action-card"
                style={{ "--action-accent": action.color }}
                onClick={() => onNavigate(action.id)}
                aria-label={action.title}
              >
                <div className="dashboard-action-icon">{action.icon}</div>
                <div className="dashboard-action-title">{action.title}</div>
                <div className="dashboard-action-desc">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="dashboard-section-title">Election Updates</h2>
          <div className="glass-card dashboard-list-card">
            {ELECTION_UPDATES.map((item, i) => (
              <div key={i} className="dashboard-list-row">
                <div className="dashboard-list-badge">{item.type}</div>
                <div style={{ flex: 1 }}>
                  <div className="dashboard-list-title">{item.event}</div>
                  <div className="dashboard-list-meta">{item.date}</div>
                </div>
                <span className={`badge ${item.status === "upcoming" ? "badge-blue" : "badge-green"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="dashboard-section-title">Common Questions</h2>
        <div className="glass-card dashboard-list-card">
          {RECENT_QUERIES.map((q, i) => (
            <button
              key={i}
              className="nav-item dashboard-question-row"
              onClick={() => onNavigate("assistant")}
              aria-label={`Ask: ${q}`}
            >
              <span className="dashboard-question-prefix">Ask</span>
              <span style={{ flex: 1, fontSize: 13 }}>{q}</span>
              <span className="dashboard-question-arrow">Open</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
