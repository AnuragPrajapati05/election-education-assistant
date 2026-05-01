// src/pages/EligibilityPage.jsx
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { saveEligibilityCheck, trackEvent } from "../services/firebase";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Jammu & Kashmir","Ladakh",
];

function checkEligibility(form) {
  const results = [];
  let eligible = true;

  // Age check
  if (!form.dob) {
    results.push({ pass: false, text: "Date of birth is required to check age eligibility." });
    eligible = false;
  } else {
    const dob = new Date(form.dob);
    const today = new Date();
    // Qualifying date: January 1st of current year
    const qualifying = new Date(today.getFullYear(), 0, 1);
    let age = qualifying.getFullYear() - dob.getFullYear();
    const m = qualifying.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && qualifying.getDate() < dob.getDate())) age--;
    if (age >= 18) {
      results.push({ pass: true, text: `Age ${age} years  meets the minimum age requirement of 18 years.` });
    } else {
      results.push({ pass: false, text: `Age ${age} years  must be at least 18 years as of January 1st of the qualifying year.` });
      eligible = false;
    }
  }

  // Citizenship
  if (form.citizen === "yes") {
    results.push({ pass: true, text: "Indian citizenship  meets citizenship requirement." });
  } else if (form.citizen === "no") {
    results.push({ pass: false, text: "Must be a citizen of India to vote in Indian elections." });
    eligible = false;
  }

  // Residence
  if (form.state) {
    results.push({ pass: true, text: `Residing in ${form.state}  you can register in your constituency.` });
  }

  // Existing registration
  if (form.hasVoterId === "yes") {
    results.push({ pass: true, text: "Already registered  you can vote using your existing Voter ID (EPIC)." });
  } else if (form.hasVoterId === "no") {
    results.push({ pass: null, text: "Not registered yet  you will need to apply for voter registration." });
  }

  // Mental health / disqualification
  if (form.disqualified === "yes") {
    results.push({ pass: false, text: "Persons of unsound mind or disqualified under law cannot be registered." });
    eligible = false;
  }

  return { eligible, results };
}

const DOC_CHECKLIST = [
  { id: 1, name: "Form 6 (Application for new voter registration)", required: true },
  { id: 2, name: "Proof of Age (Birth certificate / 10th marksheet / Passport)", required: true },
  { id: 3, name: "Proof of Residence (Aadhaar card / Utility bill / Bank passbook)", required: true },
  { id: 4, name: "1 Passport-size photograph (colour)", required: true },
  { id: 5, name: "Aadhaar card (for linking  recommended)", required: false },
  { id: 6, name: "Proof of citizenship (if not evident from above)", required: false },
];

export default function EligibilityPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [form, setForm] = useState({ dob: "", citizen: "", state: "", hasVoterId: "", disqualified: "no" });
  const [result, setResult] = useState(null);
  const [checkedDocs, setCheckedDocs] = useState([]);

  const handleCheck = async () => {
    const res = checkEligibility(form);
    setResult(res);
    trackEvent("eligibility_check", { eligible: res.eligible });
    if (user) {
      await saveEligibilityCheck(user.uid, { ...form, ...res }).catch(console.warn);
    }
  };

  const allFilled = form.dob && form.citizen && form.state && form.hasVoterId;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title"> {t("eligibility")}</h1>
        <p className="page-subtitle">Check if you are eligible to vote in Indian elections</p>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Form */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Your Information
          </h2>

          <div className="form-group">
            <label className="form-label" htmlFor="dob">Date of Birth *</label>
            <input
              id="dob" type="date" className="form-input"
              value={form.dob}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Are you an Indian citizen? *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["yes", "no"].map((v) => (
                <button
                  key={v}
                  className={`btn ${form.citizen === v ? "btn-primary" : "btn-ghost"}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm({ ...form, citizen: v })}
                  aria-pressed={form.citizen === v}
                >
                  {v === "yes" ? " Yes" : " No"}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="state">State of Residence *</label>
            <select
              id="state" className="form-select"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option value="">Select your state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Do you already have a Voter ID card? *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ v: "yes", label: "Yes, I have one" }, { v: "no", label: "No, I need to register" }].map(({ v, label }) => (
                <button
                  key={v}
                  className={`btn btn-sm ${form.hasVoterId === v ? "btn-primary" : "btn-ghost"}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setForm({ ...form, hasVoterId: v })}
                  aria-pressed={form.hasVoterId === v}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Are you disqualified from voting under any law?</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["no", "yes"].map((v) => (
                <button
                  key={v}
                  className={`btn btn-sm ${form.disqualified === v ? "btn-primary" : "btn-ghost"}`}
                  style={{ flex: 1 }}
                  onClick={() => setForm({ ...form, disqualified: v })}
                  aria-pressed={form.disqualified === v}
                >
                  {v === "no" ? "No" : "Yes"}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={handleCheck}
            disabled={!allFilled}
            aria-label="Check eligibility"
          >
            Check My Eligibility
          </button>
        </div>

        {/* Result & Checklist */}
        <div>
          {result && (
            <div className={`eligibility-result animate-in ${result.eligible ? "eligible" : "ineligible"}`}>
              <div className="eligibility-icon" aria-hidden="true">
                {result.eligible ? "" : ""}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: result.eligible ? "#059669" : "#dc2626", marginBottom: 8 }}>
                {result.eligible ? "You are eligible to vote!" : "Not currently eligible"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginTop: 16 }}>
                {result.results.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0, fontSize: 16 }}>
                      {r.pass === true ? "" : r.pass === false ? "" : ""}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document checklist */}
          <div className="glass-card" style={{ padding: 24, marginTop: result ? 20 : 0 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
               Document Checklist
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Documents required for voter registration (Form 6):
            </p>
            {DOC_CHECKLIST.map((doc) => (
              <label
                key={doc.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={checkedDocs.includes(doc.id)}
                  onChange={(e) => {
                    setCheckedDocs((p) =>
                      e.target.checked ? [...p, doc.id] : p.filter((id) => id !== doc.id)
                    );
                  }}
                  style={{ marginTop: 3, accentColor: "var(--accent-primary)" }}
                  aria-label={doc.name}
                />
                <div>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{doc.name}</span>
                  <span
                    className={`badge ${doc.required ? "badge-red" : "badge-green"}`}
                    style={{ marginLeft: 8, fontSize: 10, padding: "1px 6px" }}
                  >
                    {doc.required ? "Required" : "Optional"}
                  </span>
                </div>
              </label>
            ))}
            {checkedDocs.length > 0 && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "rgba(16,185,129,0.08)", fontSize: 13, color: "#059669" }}>
                 {checkedDocs.length} of {DOC_CHECKLIST.length} documents ready
                {checkedDocs.length >= DOC_CHECKLIST.filter(d => d.required).length && "  Required documents complete!"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
