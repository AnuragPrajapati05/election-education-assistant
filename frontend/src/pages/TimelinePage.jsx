// src/pages/TimelinePage.jsx
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const ELECTION_TIMELINE = [
  {
    phase: "Announcement",
    icon: "📢",
    date: "Day 0",
    title: "Model Code of Conduct Comes Into Effect",
    desc: "Election Commission announces election schedule. Model Code of Conduct (MCC) immediately takes effect, restricting ruling parties from making policy announcements.",
    status: "complete",
    color: "#6366f1",
  },
  {
    phase: "Nominations",
    icon: "📝",
    date: "Day 7–14",
    title: "Nomination Filing Period",
    desc: "Candidates file nomination papers with the Returning Officer. Security deposit required. Nomination must include affidavit disclosing criminal record, assets, and education.",
    status: "complete",
    color: "#2563eb",
  },
  {
    phase: "Scrutiny",
    icon: "🔍",
    date: "Day 15",
    title: "Scrutiny of Nominations",
    desc: "Returning Officer examines nomination papers for validity. Defective papers may be rejected after hearing candidates.",
    status: "complete",
    color: "#0ea5e9",
  },
  {
    phase: "Withdrawal",
    icon: "↩️",
    date: "Day 16–17",
    title: "Withdrawal of Candidature",
    desc: "Candidates may withdraw from the contest within two days after scrutiny. Final list of candidates is published.",
    status: "active",
    color: "#10b981",
  },
  {
    phase: "Campaigning",
    icon: "🎙️",
    date: "Day 18 – Day -2",
    title: "Electoral Campaigning",
    desc: "Parties and candidates campaign through rallies, door-to-door outreach, media. Campaign silence period begins 48 hours before polling.",
    status: "upcoming",
    color: "#f59e0b",
  },
  {
    phase: "Polling",
    icon: "🗳️",
    date: "Polling Day",
    title: "Voting Takes Place",
    desc: "Polling stations open 7 AM to 6 PM. Voters verify identity, get finger inked, use EVM to cast vote. VVPAT provides paper trail verification.",
    status: "upcoming",
    color: "#2563eb",
  },
  {
    phase: "Counting",
    icon: "🔢",
    date: "Counting Day",
    title: "Vote Counting & Results",
    desc: "EVMs are brought to counting centers. Votes counted under strict supervision. Results declared constituency-wise. Winning candidates receive Certificate of Election.",
    status: "upcoming",
    color: "#6366f1",
  },
];

const REGISTRATION_STEPS = [
  {
    step: 1, title: "Check Roll / Form 6",
    icon: "🔎", color: "#2563eb",
    desc: "Visit voters.eci.gov.in or your state CEOs website. Check if your name already exists on the Electoral Roll.",
    action: "Go to voters.eci.gov.in",
    link: "https://voters.eci.gov.in",
  },
  {
    step: 2, title: "Fill Form 6",
    icon: "📝", color: "#6366f1",
    desc: "Fill the online Form 6 for new voter registration. Provide personal details, address, and upload documents.",
    action: "Fill Form 6 Online",
    link: "https://voters.eci.gov.in/home",
  },
  {
    step: 3, title: "Upload Documents",
    icon: "📎", color: "#0ea5e9",
    desc: "Upload scanned copies of proof of age, proof of address, and a recent passport-size photograph.",
    action: null,
  },
  {
    step: 4, title: "Submit Application",
    icon: "✅", color: "#10b981",
    desc: "Submit the form online or at your local Electoral Registration Office (ERO). Note down your reference number.",
    action: null,
  },
  {
    step: 5, title: "Verification",
    icon: "🏠", color: "#f59e0b",
    desc: "A Booth Level Officer (BLO) may visit your address for verification, or you may be called for in-person verification.",
    action: null,
  },
  {
    step: 6, title: "Receive EPIC",
    icon: "🪪", color: "#ef4444",
    desc: "After approval (usually 2–3 weeks), your Voter ID (EPIC - Elector's Photo Identity Card) is issued. Download eEPIC from the portal.",
    action: "Check Application Status",
    link: "https://voters.eci.gov.in/home",
  },
];

export default function TimelinePage() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(null);
  const [registrationStep, setRegistrationStep] = useState(0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">📅 {t("timeline")}</h1>
        <p className="page-subtitle">How Indian elections work — from announcement to results</p>
      </div>

      <div className="grid-2" style={{ gap: 28, alignItems: "start" }}>
        {/* Election Process Timeline */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
            Election Process Phases
          </h2>
          <div className="timeline">
            {ELECTION_TIMELINE.map((item, i) => (
              <div
                key={i}
                className={`timeline-item ${activeStep === i ? "active" : ""}`}
                style={{ cursor: "pointer", animationDelay: `${i * 0.06}s` }}
                onClick={() => setActiveStep(activeStep === i ? null : i)}
              >
                <div
                  className={`timeline-dot ${item.status === "complete" ? "complete" : item.status === "active" ? "active" : ""}`}
                  style={{ borderColor: item.color }}
                />
                <div
                  className="timeline-content"
                  style={activeStep === i ? { borderColor: item.color, boxShadow: `0 0 0 2px ${item.color}22` } : {}}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="timeline-date">{item.date}</div>
                      <div className="timeline-title">
                        <span style={{ marginRight: 6 }}>{item.icon}</span>
                        {item.title}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span
                        className={`badge ${item.status === "complete" ? "badge-green" : item.status === "active" ? "badge-blue" : "badge-amber"}`}
                        style={{ fontSize: 10 }}
                      >
                        {item.status}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.phase}</span>
                    </div>
                  </div>
                  {activeStep === i && (
                    <div className="timeline-desc" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-light)", display: "block" }}>
                      {item.desc}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voter Registration Steps */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
            Voter Registration Walkthrough
          </h2>

          {/* Progress indicator */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Step {Math.min(registrationStep + 1, REGISTRATION_STEPS.length)} of {REGISTRATION_STEPS.length}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-primary)" }}>
                {Math.round((registrationStep / REGISTRATION_STEPS.length) * 100)}% complete
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 10, background: "var(--border-light)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(registrationStep / REGISTRATION_STEPS.length) * 100}%`,
                  background: "var(--gradient-accent)",
                  borderRadius: 10,
                  transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
          </div>

          {REGISTRATION_STEPS.map((step, i) => (
            <div
              key={step.step}
              className="glass-card"
              style={{
                padding: "18px 20px", marginBottom: 12,
                borderLeft: `3px solid ${i <= registrationStep ? step.color : "var(--border-light)"}`,
                opacity: i > registrationStep + 1 ? 0.5 : 1,
                cursor: "pointer",
                transition: "var(--transition)",
              }}
              onClick={() => setRegistrationStep(i)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: i <= registrationStep ? step.color : "var(--border-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: i <= registrationStep ? "white" : "var(--text-muted)",
                    transition: "var(--transition)",
                  }}
                >
                  {i < registrationStep ? "✓" : step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {step.step}. {step.title}
                    </div>
                    {i < registrationStep && (
                      <span className="badge badge-green" style={{ fontSize: 10 }}>Done</span>
                    )}
                    {i === registrationStep && (
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>Current</span>
                    )}
                  </div>
                  {i <= registrationStep && (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.6 }}>
                      {step.desc}
                    </div>
                  )}
                  {step.action && i === registrationStep && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 10, fontSize: 12 }}
                    >
                      {step.action} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setRegistrationStep((p) => Math.max(0, p - 1))}
              disabled={registrationStep === 0}
            >
              ← Back
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => setRegistrationStep((p) => Math.min(REGISTRATION_STEPS.length - 1, p + 1))}
              disabled={registrationStep === REGISTRATION_STEPS.length - 1}
            >
              {registrationStep === REGISTRATION_STEPS.length - 1 ? "✓ All Steps Complete" : "Next Step →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
