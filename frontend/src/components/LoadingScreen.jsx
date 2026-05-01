// src/components/LoadingScreen.jsx
export default function LoadingScreen({ mini = false }) {
  if (mini) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="typing-dot"
              style={{ width: 10, height: 10, background: "var(--accent-primary)", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--gradient-hero)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 20,
      }}
      role="status"
      aria-label="Loading application"
    >
      <div
        style={{
          width: 72, height: 72,
          background: "var(--gradient-accent)",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36,
          boxShadow: "var(--shadow-glow)",
          animation: "float 2s ease-in-out infinite",
        }}
      >

      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          ElectionEdu
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Loading your civic education platform...
        </div>
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="typing-dot"
            style={{
              width: 9, height: 9,
              background: "var(--accent-primary)",
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
