// src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsStats, trackEvent } from "../services/firebase";

const MOCK_STATS = {
  totalUsers: 1247,
  chatSessions: 3891,
  avgEngagement: "4m 32s",
  eligibilityChecks: 892,
  registrationStarts: 543,
  completionRate: "67%",
};

const RECENT_ACTIVITY = [
  { user: "User #4821", action: "Completed eligibility check", time: "2 min ago", type: "eligibility" },
  { user: "User #3102", action: "Asked: How to get duplicate Voter ID?", time: "5 min ago", type: "chat" },
  { user: "User #9034", action: "Started registration form", time: "8 min ago", type: "registration" },
  { user: "User #1567", action: "Used booth locator — Chandigarh", time: "12 min ago", type: "booth" },
  { user: "User #7823", action: "Switched language to Hindi", time: "18 min ago", type: "language" },
];

const TOP_QUESTIONS = [
  { q: "How to register to vote?", count: 342 },
  { q: "Eligibility requirements for 2025", count: 291 },
  { q: "What documents are needed?", count: 218 },
  { q: "How does EVM work?", count: 187 },
  { q: "Where is my polling booth?", count: 156 },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(MOCK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAnalyticsStats();
        if (data && data.totalUsers) setStats(data);
      } catch (e) {
        console.warn("Using mock analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
    trackEvent("admin_page_view", { uid: user?.uid });
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="glass-card" style={{ padding: 60, textAlign: "center", maxWidth: 500, margin: "80px auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ color: "var(--text-secondary)" }}>This page is only accessible to admin users.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">⚙️ Admin Dashboard</h1>
        <p className="page-subtitle">Platform analytics and engagement metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Users", value: stats.totalUsers?.toLocaleString(), icon: "👥", color: "#2563eb" },
          { label: "Chat Sessions", value: stats.chatSessions?.toLocaleString(), icon: "💬", color: "#6366f1" },
          { label: "Avg Engagement", value: stats.avgEngagement, icon: "⏱️", color: "#10b981" },
          { label: "Eligibility Checks", value: stats.eligibilityChecks?.toLocaleString(), icon: "✅", color: "#f59e0b" },
          { label: "Registration Starts", value: stats.registrationStarts?.toLocaleString(), icon: "📝", color: "#0ea5e9" },
          { label: "Completion Rate", value: stats.completionRate, icon: "📈", color: "#ef4444" },
        ].map((s, i) => (
          <div key={i} className="glass-card stat-card animate-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            </div>
            <div className="stat-value" style={{ fontSize: 26 }}>{loading ? "—" : s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Recent activity */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Recent Activity
          </h2>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} style={{
                padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-start",
                borderBottom: i < RECENT_ACTIVITY.length - 1 ? "1px solid var(--border-light)" : "none",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: item.type === "chat" ? "rgba(99,102,241,0.1)" :
                               item.type === "eligibility" ? "rgba(16,185,129,0.1)" :
                               item.type === "registration" ? "rgba(37,99,235,0.1)" : "rgba(245,158,11,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                }}>
                  {item.type === "chat" ? "💬" : item.type === "eligibility" ? "✅" : item.type === "registration" ? "📝" : item.type === "booth" ? "📍" : "🌐"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.action}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.user} · {item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top questions */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Top Questions Asked
          </h2>
          <div className="glass-card" style={{ padding: 20 }}>
            {TOP_QUESTIONS.map((item, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.q}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)" }}>{item.count}</span>
                </div>
                <div style={{ height: 5, borderRadius: 10, background: "var(--border-light)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 10,
                    width: `${(item.count / TOP_QUESTIONS[0].count) * 100}%`,
                    background: `hsl(${220 + i * 15}, 85%, ${55 + i * 5}%)`,
                    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Export */}
          <div className="glass-card" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Export Data</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-secondary btn-sm">📊 Export CSV</button>
              <button className="btn btn-secondary btn-sm">📄 Export PDF Report</button>
              <button className="btn btn-ghost btn-sm">🔄 Refresh Data</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
