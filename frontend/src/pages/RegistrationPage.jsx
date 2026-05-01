// src/pages/RegistrationPage.jsx
import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const FORM_STEPS = [
  {
    id: "personal",
    title: "Personal Details",
    icon: "👤",
    fields: [
      { id: "firstName", label: "First Name", type: "text", required: true, placeholder: "Enter first name" },
      { id: "lastName", label: "Last Name", type: "text", required: true, placeholder: "Enter last name" },
      { id: "dob", label: "Date of Birth", type: "date", required: true },
      { id: "gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Third Gender"] },
      { id: "mobile", label: "Mobile Number", type: "tel", required: true, placeholder: "10-digit mobile" },
    ],
  },
  {
    id: "address",
    title: "Current Address",
    icon: "🏠",
    fields: [
      { id: "houseNo", label: "House/Flat Number", type: "text", required: true, placeholder: "Enter house/flat no." },
      { id: "street", label: "Street / Area", type: "text", required: true, placeholder: "Enter street name" },
      { id: "city", label: "City / Town / Village", type: "text", required: true, placeholder: "Enter city name" },
      { id: "district", label: "District", type: "text", required: true, placeholder: "Enter district" },
      { id: "state", label: "State", type: "select", required: true, options: ["Chandigarh","Delhi","Punjab","Haryana","Uttar Pradesh","Maharashtra","Gujarat","Karnataka"] },
      { id: "pincode", label: "PIN Code", type: "text", required: true, placeholder: "6-digit PIN" },
    ],
  },
  {
    id: "documents",
    title: "Upload Documents",
    icon: "📎",
    fields: [
      { id: "ageProof", label: "Proof of Age", type: "file", required: true, accept: ".pdf,.jpg,.png", hint: "Birth certificate, 10th Marksheet, or Passport" },
      { id: "addressProof", label: "Proof of Address", type: "file", required: true, accept: ".pdf,.jpg,.png", hint: "Aadhaar, Utility bill, or Bank passbook" },
      { id: "photo", label: "Passport-size Photo", type: "file", required: true, accept: ".jpg,.png", hint: "Recent colour photograph, white background" },
    ],
  },
  {
    id: "review",
    title: "Review & Submit",
    icon: "✅",
    fields: [],
  },
];

function StepIndicator({ steps, current }) {
  return (
    <div className="steps-container">
      {steps.map((step, i) => (
        <div key={step.id} className="step-item">
          <div style={{ textAlign: "center" }}>
            <div
              className={`step-circle ${i < current ? "complete" : i === current ? "active" : ""}`}
            >
              {i < current ? "✓" : step.icon}
            </div>
            <div className="step-label" style={{ color: i === current ? "var(--accent-primary)" : "var(--text-muted)" }}>
              {step.title}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${i < current ? "complete" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FormField({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <div className="form-group">
        <label className="form-label" htmlFor={field.id}>
          {field.label} {field.required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
        </label>
        <select
          id={field.id}
          className="form-select"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          required={field.required}
        >
          <option value="">Select {field.label}</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  if (field.type === "file") {
    return (
      <div className="form-group">
        <label className="form-label" htmlFor={field.id}>
          {field.label} {field.required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
        </label>
        <div
          style={{
            border: "2px dashed var(--border-medium)", borderRadius: "var(--radius-sm)",
            padding: "20px 16px", textAlign: "center", cursor: "pointer",
            background: value ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.5)",
            transition: "var(--transition)",
          }}
          onClick={() => document.getElementById(field.id).click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onChange(field.id, e.dataTransfer.files[0]?.name || "file"); }}
        >
          <input
            id={field.id} type="file" style={{ display: "none" }}
            accept={field.accept}
            onChange={(e) => onChange(field.id, e.target.files[0]?.name || "")}
          />
          {value ? (
            <div style={{ color: "#059669", fontSize: 13 }}>✅ {value}</div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Click to upload or drag & drop</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{field.hint}</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.id}>
        {field.label} {field.required && <span style={{ color: "var(--accent-danger)" }}>*</span>}
      </label>
      <input
        id={field.id}
        type={field.type}
        className="form-input"
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        required={field.required}
      />
    </div>
  );
}

export default function RegistrationPage() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [refNo] = useState(() => "ECI" + Math.random().toString(36).slice(2, 9).toUpperCase());

  const handleChange = (id, value) => setFormData((p) => ({ ...p, [id]: value }));

  const handleNext = () => {
    if (currentStep < FORM_STEPS.length - 1) setCurrentStep((p) => p + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    // In production: submit to backend, save to Firestore
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="glass-card animate-in" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Application Submitted!
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
            Your voter registration application (Form 6) has been submitted successfully.
          </p>
          <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: "inline-block" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>REFERENCE NUMBER</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--accent-primary)" }}>
              {refNo}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>
            📬 A confirmation SMS has been sent to your mobile.<br />
            👤 A Booth Level Officer will verify your address within 2-4 weeks.<br />
            🪪 Your Voter ID (EPIC) will be dispatched after approval.
          </div>
          <a
            href="https://voters.eci.gov.in/home"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Track Your Application ↗
          </a>
        </div>
      </div>
    );
  }

  const step = FORM_STEPS[currentStep];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">📝 {t("registration")}</h1>
        <p className="page-subtitle">Complete Form 6 — New Voter Registration</p>
      </div>

      <StepIndicator steps={FORM_STEPS} current={currentStep} />

      <div className="glass-card" style={{ padding: 32 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <span>{step.icon}</span>
          <span>{step.title}</span>
        </h2>

        {currentStep < 3 ? (
          <div className="grid-2" style={{ gap: 0 }}>
            {step.fields.map((field) => (
              <div key={field.id} style={{ gridColumn: field.type === "file" || field.id === "street" ? "span 2" : undefined }}>
                <FormField field={field} value={formData[field.id]} onChange={handleChange} />
              </div>
            ))}
          </div>
        ) : (
          /* Review step */
          <div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14 }}>
              Please review your information before submitting Form 6 to the Election Commission.
            </p>
            {FORM_STEPS.slice(0, 3).map((s) => (
              <div key={s.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.icon} {s.title}
                </div>
                <div className="glass-card" style={{ padding: "12px 16px" }}>
                  {s.fields.map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)", fontSize: 13 }}>
                      <span style={{ color: "var(--text-muted)" }}>{f.label}</span>
                      <span style={{ fontWeight: 600, color: formData[f.id] ? "var(--text-primary)" : "var(--accent-danger)" }}>
                        {formData[f.id] || "Not provided"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ padding: 16, background: "rgba(37,99,235,0.06)", borderRadius: "var(--radius-sm)", marginTop: 16, fontSize: 13, color: "var(--text-secondary)" }}>
              <strong>Declaration:</strong> I hereby declare that the above information is true and correct to the best of my knowledge. I am a citizen of India and eligible to be registered as a voter.
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
          {currentStep > 0 ? (
            <button className="btn btn-ghost" onClick={() => setCurrentStep((p) => p - 1)}>
              ← Back
            </button>
          ) : <div />}
          <button className="btn btn-primary btn-lg" onClick={handleNext}>
            {currentStep === FORM_STEPS.length - 1 ? "Submit Application →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
