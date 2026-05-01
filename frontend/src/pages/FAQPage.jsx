// src/pages/FAQPage.jsx
import { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { trackEvent } from "../services/firebase";

const FAQS = [
  {
    category: "Registration",
    q: "How do I register as a new voter?",
    a: "Visit voters.eci.gov.in and fill Form 6 online. You'll need proof of age, proof of address, and a passport-size photograph. Submit the form and a Booth Level Officer (BLO) will verify your details within 2-4 weeks. You can track the status online."
  },
  {
    category: "Registration",
    q: "What is the deadline for voter registration before an election?",
    a: "The voter rolls are typically frozen 45-60 days before an election date. Special summary revision campaigns are held periodically. The Election Commission announces specific deadlines for each election. Check the official ECI website for current deadlines."
  },
  {
    category: "Registration",
    q: "Can I register if I've recently moved to a new city?",
    a: "Yes! If you've moved, you need to delete your name from the old constituency (Form 7) and register in the new constituency (Form 6). You can do this simultaneously online at voters.eci.gov.in. Provide proof of your new address."
  },
  {
    category: "Eligibility",
    q: "What is the minimum voting age in India?",
    a: "You must be at least 18 years of age as of January 1st of the qualifying year. This means if you turn 18 after January 1st, you'll be eligible to vote in the next electoral roll revision cycle."
  },
  {
    category: "Eligibility",
    q: "Can Non-Resident Indians (NRIs) vote?",
    a: "Yes! NRIs who are Indian citizens can register as overseas voters by filling Form 6A. They must appear in person at their assigned polling booth in India to vote. They cannot use postal ballots. Their enrollment is in the constituency of their original Indian address."
  },
  {
    category: "Voting Process",
    q: "How does the Electronic Voting Machine (EVM) work?",
    a: "An EVM consists of a Control Unit (with polling officer) and a Balloting Unit (with voter). When the officer enables the unit, the voter presses the button next to their preferred candidate. The vote is electronically stored. The VVPAT (Voter Verifiable Paper Audit Trail) shows a paper slip confirming your vote for 7 seconds."
  },
  {
    category: "Voting Process",
    q: "What is NOTA and when can I use it?",
    a: "NOTA stands for 'None of the Above.' It is the last option on the EVM ballot. If you don't wish to vote for any candidate, you can press NOTA. However, even if NOTA gets the most votes, the candidate with the highest number of votes among candidates wins. NOTA has no legal effect on the election result."
  },
  {
    category: "Documents",
    q: "What ID can I bring to vote if I don't have a Voter ID?",
    a: "The ECI accepts 12 alternative photo IDs: Aadhaar card, Passport, Driving License, PAN card, Indian Post Passport, Employee ID (central/state government), Bank/Post Office passbook with photo, Smart card issued under MGNREGS, Health Insurance smart card, Pension document with photo, and NPR Smart Card."
  },
  {
    category: "Documents",
    q: "How do I get a duplicate Voter ID (EPIC) if it's lost?",
    a: "Log in to voters.eci.gov.in and apply for a duplicate EPIC card. You'll need to submit an FIR copy for lost cards. You can also download the eEPIC (digital Voter ID) directly from the portal by verifying your mobile OTP  this is free and accepted as a valid document."
  },
  {
    category: "Election Types",
    q: "What are the different types of elections in India?",
    a: "India has four main types of elections: (1) Lok Sabha elections (General Elections) every 5 years for Parliament, (2) Vidhan Sabha elections for State Assemblies every 5 years, (3) Rajya Sabha elections for the Upper House (indirect), and (4) Local Body elections for municipalities, panchayats, and corporations conducted by State Election Commissions."
  },
  {
    category: "Election Types",
    q: "What is the difference between Lok Sabha and Vidhan Sabha?",
    a: "Lok Sabha is India's lower house of Parliament  543 elected seats representing the entire country. Vidhan Sabha is the State Legislative Assembly  number of seats varies by state (e.g., UP has 403, Delhi has 70). Lok Sabha members are called MPs (Members of Parliament), while Vidhan Sabha members are MLAs (Members of Legislative Assembly)."
  },
  {
    category: "Problems / Corrections",
    q: "What should I do if my name is not on the voter list?",
    a: "Check your enrollment at electoralsearch.eci.gov.in or call the helpline 1950. If not found, apply fresh via Form 6. If you believe you're registered but not listed, visit your ERO (Electoral Registration Officer) or contact the Chief Electoral Officer of your state."
  },
];

const CATEGORIES = ["All", ...new Set(FAQS.map((f) => f.category))];

export default function FAQPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => FAQS.filter((faq) => {
    const matchCat = activeCategory === "All" || faq.category === activeCategory;
    const matchSearch = !search || faq.q.toLowerCase().includes(search.toLowerCase()) || faq.a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [search, activeCategory]);

  const handleOpen = (i) => {
    setOpenIndex(openIndex === i ? null : i);
    trackEvent("faq_viewed", { question: filtered[i]?.q?.slice(0, 50) });
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title"> {t("faq")}</h1>
        <p className="page-subtitle">Frequently asked questions about Indian elections and voting</p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 16, color: "var(--text-muted)", pointerEvents: "none",
        }}></span>
        <input
          type="search"
          className="form-input"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40 }}
          aria-label="Search FAQ"
        />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm ${activeCategory === cat ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      <div role="list" aria-label="Frequently asked questions">
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}></div>
            <p style={{ color: "var(--text-secondary)" }}>No questions found for "{search}"</p>
          </div>
        ) : (
          filtered.map((faq, i) => (
            <div key={i} className={`faq-item ${openIndex === i ? "open" : ""}`} role="listitem">
              <button
                className="faq-question"
                onClick={() => handleOpen(i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
              >
                <div>
                  <span className="badge badge-blue" style={{ fontSize: 10, marginRight: 8 }}>{faq.category}</span>
                  {faq.q}
                </div>
                <span className="faq-chevron" aria-hidden="true"></span>
              </button>
              <div
                className={`faq-answer ${openIndex === i ? "open" : ""}`}
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
              >
                {faq.a}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Help prompt */}
      <div
        className="glass-card"
        style={{
          padding: 24, marginTop: 28, textAlign: "center",
          background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(99,102,241,0.06))",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}></div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          Didn't find your answer?
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          Ask our AI Assistant  it can answer more specific questions about elections.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm">Ask AI Assistant </button>
          <a href="tel:1950" className="btn btn-ghost btn-sm"> Call 1950 (Helpline)</a>
        </div>
      </div>
    </div>
  );
}
