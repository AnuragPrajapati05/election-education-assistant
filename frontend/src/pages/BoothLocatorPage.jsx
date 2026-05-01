// src/pages/BoothLocatorPage.jsx
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { trackEvent } from "../services/firebase";

// Mock booths data — in production, fetch from Firestore
const MOCK_BOOTHS = [
  { id: 1, name: "Government Primary School, Sector 15", address: "Sector 15, Chandigarh - 160015", distance: "0.8 km", lat: 30.7355, lng: 76.7883, voters: 1240 },
  { id: 2, name: "Community Hall, Sector 17", address: "Sector 17, Chandigarh - 160017", distance: "1.2 km", lat: 30.7410, lng: 76.7840, voters: 980 },
  { id: 3, name: "DAV Public School", address: "Sector 8, Chandigarh - 160009", distance: "2.1 km", lat: 30.7460, lng: 76.7960, voters: 1560 },
  { id: 4, name: "Chandigarh College of Engineering", address: "Sector 26, Chandigarh - 160026", distance: "3.4 km", lat: 30.7274, lng: 76.7680, voters: 2100 },
];

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

function MapPlaceholder({ booths, userLocation }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#dbeafe");
    grad.addColorStop(1, "#ede9fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(148,163,184,0.3)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Roads
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 6;
    [[0.3, 0, 0.3, 1], [0, 0.4, 1, 0.4], [0.6, 0, 0.6, 1], [0, 0.7, 1, 0.7]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1*W, y1*H); ctx.lineTo(x2*W, y2*H); ctx.stroke();
    });

    // Booth pins
    const positions = [[0.3, 0.4], [0.55, 0.3], [0.7, 0.6], [0.2, 0.65]];
    booths.forEach((booth, i) => {
      if (!positions[i]) return;
      const [px, py] = positions[i];
      const x = px * W, y = py * H;

      // Drop shadow
      ctx.shadowColor = "rgba(37,99,235,0.3)";
      ctx.shadowBlur = 12;

      // Pin body
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(x, y - 4, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - 7, y + 8);
      ctx.lineTo(x + 7, y + 8);
      ctx.lineTo(x, y + 22);
      ctx.fill();

      // Pin icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = "white";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x, y - 4);

      // Label
      ctx.fillStyle = "#0f172a";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(booth.name.slice(0, 18) + "…", x, y + 32);
    });

    // User location
    ctx.fillStyle = "#10b981";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(16,185,129,0.4)";
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(W * 0.45, H * 0.5, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Legend
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.roundRect?.(8, H - 50, 140, 42, 8);
    ctx.fill?.();
    ctx.fillStyle = "#0f172a"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
    ctx.fillStyle = "#10b981"; ctx.fillRect(14, H - 42, 10, 10);
    ctx.fillStyle = "#0f172a"; ctx.fillText("Your Location", 30, H - 34);
    ctx.fillStyle = "#2563eb"; ctx.fillRect(14, H - 26, 10, 10);
    ctx.fillStyle = "#0f172a"; ctx.fillText("Polling Booth", 30, H - 18);
  }, [booths]);

  if (MAPS_API_KEY) {
    // Real Google Maps embed
    const center = "30.7333,76.7794";
    return (
      <iframe
        title="Polling Booth Map"
        src={`https://www.google.com/maps/embed/v1/search?key=${MAPS_API_KEY}&q=polling+booth+chandigarh&center=${center}&zoom=13`}
        style={{ width: "100%", height: 380, border: "none" }}
        aria-label="Google Maps showing polling booths"
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={560} height={380} style={{ width: "100%", height: 380, display: "block" }} aria-label="Simulated map of polling booths" />
      <div
        style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
          borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
        }}
      >
        📍 Demo Map — Configure Google Maps API for live data
      </div>
    </div>
  );
}

export default function BoothLocatorPage() {
  const { t } = useLanguage();
  const [epicNumber, setEpicNumber] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!epicNumber.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSearched(true);
    setLoading(false);
    trackEvent("booth_search", { epic_length: epicNumber.length });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">📍 {t("booth")}</h1>
        <p className="page-subtitle">Find your assigned polling booth using your Voter ID or address</p>
      </div>

      {/* Search */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label className="form-label" htmlFor="epic">Voter ID (EPIC Number)</label>
            <input
              id="epic" type="text" className="form-input"
              placeholder="e.g. ABC1234567"
              value={epicNumber}
              onChange={(e) => setEpicNumber(e.target.value.toUpperCase())}
              maxLength={10}
              pattern="[A-Z]{3}[0-9]{7}"
              aria-describedby="epic-help"
            />
            <span id="epic-help" style={{ fontSize: 11, color: "var(--text-muted)" }}>Format: ABC1234567</span>
          </div>
          <div className="form-group" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label className="form-label" htmlFor="pincode">OR Enter Pincode</label>
            <input id="pincode" type="text" className="form-input" placeholder="e.g. 160015" maxLength={6} />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !epicNumber.trim()}
            style={{ marginBottom: 0, alignSelf: "flex-start", marginTop: 22 }}
          >
            {loading ? "Searching..." : "🔍 Find My Booth"}
          </button>
        </form>
      </div>

      {searched && (
        <div className="animate-in">
          <div className="grid-2" style={{ gap: 20, alignItems: "start" }}>
            {/* Map */}
            <div
              className="glass-card"
              style={{ padding: 0, overflow: "hidden" }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>📍 Nearby Polling Booths</span>
              </div>
              <MapPlaceholder booths={MOCK_BOOTHS} />
            </div>

            {/* Booth list */}
            <div>
              <div className="glass-card" style={{ padding: 16, marginBottom: 16, borderColor: "rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.04)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", marginBottom: 4 }}>YOUR ASSIGNED BOOTH</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{MOCK_BOOTHS[0].name}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{MOCK_BOOTHS[0].address}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <span className="badge badge-green">✓ Active Booth</span>
                  <span className="badge badge-blue">🚶 {MOCK_BOOTHS[0].distance}</span>
                  <span className="badge badge-purple">👥 {MOCK_BOOTHS[0].voters.toLocaleString()} voters</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(MOCK_BOOTHS[0].address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    🗺️ Get Directions
                  </a>
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Other Booths Nearby</h3>
              {MOCK_BOOTHS.slice(1).map((booth) => (
                <button
                  key={booth.id}
                  className="glass-card"
                  style={{
                    padding: "14px 18px", marginBottom: 10, display: "block", width: "100%",
                    textAlign: "left", cursor: "pointer",
                    borderColor: selectedBooth === booth.id ? "var(--accent-primary)" : "var(--border-light)",
                  }}
                  onClick={() => setSelectedBooth(selectedBooth === booth.id ? null : booth.id)}
                  aria-expanded={selectedBooth === booth.id}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{booth.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{booth.address}</div>
                    </div>
                    <span className="badge badge-blue" style={{ flexShrink: 0 }}>{booth.distance}</span>
                  </div>
                  {selectedBooth === booth.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                        👥 Registered voters: {booth.voters.toLocaleString()}
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(booth.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View on Google Maps ↗
                      </a>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Booth day info */}
          <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              📋 What to Bring on Polling Day
            </h3>
            <div className="grid-3" style={{ gap: 12 }}>
              {[
                { icon: "🪪", title: "Voter ID (EPIC)", desc: "Your primary identity document at the booth" },
                { icon: "📱", title: "eEPIC on Phone", desc: "Digital copy accepted as valid ID" },
                { icon: "🕐", title: "Go Early", desc: "Polls open 7 AM. Avoid afternoon queues" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!searched && (
        <div className="glass-card" style={{ padding: 40, textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Locate Your Polling Booth
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
            Enter your Voter ID or pincode above to find your assigned polling booth and get directions.
          </p>
        </div>
      )}
    </div>
  );
}
