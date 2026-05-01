import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage, LANGUAGES } from "../context/LanguageContext";
import { logOut } from "../services/firebase";

export default function Navbar({ onMenuToggle, onAuthClick }) {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logOut();
    setShowUserMenu(false);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <button
        className="btn btn-icon btn-ghost nav-toggle"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
      >
        <span className="nav-toggle-lines" aria-hidden="true" />
      </button>

      <a className="navbar-brand" href="#" aria-label="Election Education Assistant Home">
        <BrandMark />
        <div className="brand-copy">
          <span className="brand-title">Vote India</span>
          <span className="brand-subtitle">Informed Election Guide</span>
        </div>
      </a>

      <div className="navbar-spacer" />

      <div className="navbar-controls">
        <div className="language-switcher">
          {Object.values(LANGUAGES).map((lang) => (
            <button
              key={lang.code}
              className={`btn btn-sm ${language === lang.code ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setLanguage(lang.code)}
              aria-label={`Switch to ${lang.name}`}
              aria-pressed={language === lang.code}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>

        <QuickA11yToggle />

        {user ? (
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-ghost btn-sm user-menu-trigger"
              onClick={() => setShowUserMenu((p) => !p)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <UserAvatar user={user} size={28} />
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.displayName?.split(" ")[0] || "User"}
              </span>
              <span aria-hidden="true">v</span>
            </button>
            {showUserMenu && (
              <div
                className="glass-card-strong"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: 180,
                  padding: "8px 0",
                  zIndex: 200,
                }}
                role="menu"
              >
                <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-light)", marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{user.displayName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</div>
                  <span className={`badge ${user.role === "admin" ? "badge-purple" : "badge-blue"}`} style={{ marginTop: 4 }}>
                    {user.role}
                  </span>
                </div>
                <button className="nav-item" role="menuitem" onClick={handleLogout}>
                  <span>Exit</span> {t("logout")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm nav-auth-button" onClick={onAuthClick}>
            {t("login")} / {t("signup")}
          </button>
        )}
      </div>
    </nav>
  );
}

function QuickA11yToggle() {
  const [hc, setHc] = useState(() => document.body.classList.contains("high-contrast"));

  const toggle = () => {
    setHc((p) => {
      document.body.classList.toggle("high-contrast", !p);
      return !p;
    });
  };

  return (
    <button
      className={`btn btn-sm ${hc ? "btn-primary" : "btn-ghost"}`}
      onClick={toggle}
      aria-label="Toggle high contrast mode"
      aria-pressed={hc}
      title="High Contrast"
    >
      Contrast
    </button>
  );
}

function BrandMark() {
  return (
    <div className="navbar-logo vote-india-logo" aria-hidden="true">
      <div className="vote-india-strokes">
        <span className="saffron" />
        <span className="white" />
        <span className="green" />
      </div>
      <div className="vote-india-finger">1</div>
    </div>
  );
}

export function UserAvatar({ user, size = 36 }) {
  const initials = (user?.displayName || user?.email || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--gradient-accent)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
