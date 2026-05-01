import { useLanguage } from "../context/LanguageContext";

const NAV_ITEMS = [
  { id: "dashboard", icon: "Home", key: "dashboard" },
  { id: "assistant", icon: "AI", key: "assistant" },
  { section: "Voter Tools" },
  { id: "eligibility", icon: "Check", key: "eligibility" },
  { id: "registration", icon: "Form", key: "registration" },
  { id: "booth", icon: "Map", key: "booth" },
  { section: "Information" },
  { id: "timeline", icon: "Time", key: "timeline" },
  { id: "calendar", icon: "Date", key: "calendar" },
  { id: "faq", icon: "FAQ", key: "faq" },
];

const ADMIN_ITEMS = [
  { section: "Administration" },
  { id: "admin", icon: "Admin", key: "admin", adminOnly: true },
];

export default function Sidebar({ open, currentPage, onNavigate, userRole }) {
  const { t } = useLanguage();
  const allItems = userRole === "admin" ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <aside
      className={`sidebar ${open ? "" : "closed"}`}
      role="complementary"
      aria-label="Navigation sidebar"
    >
      <div className="sidebar-feature-card glass-card">
        <div className="sidebar-feature-logo" aria-hidden="true">
          <div className="sidebar-feature-strokes">
            <span className="saffron" />
            <span className="white" />
            <span className="green" />
          </div>
        </div>
        <div>
          <div className="sidebar-feature-label">Next Election</div>
          <div className="sidebar-feature-title">Bihar Assembly</div>
          <div className="sidebar-feature-copy">Civic guidance and voter tools in one place</div>
        </div>
      </div>

      <nav aria-label="Page navigation">
        {allItems.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="nav-section-label" role="separator">
                {item.section}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={currentPage === item.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{t(item.key)}</span>
              {currentPage === item.id && <span className="nav-active-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer-card">
        <div className="glass-card helpline-card">
          <div className="helpline-label">Voter Helpline</div>
          <div className="helpline-number">1950</div>
          <div className="helpline-copy">Mon-Sat 10am-5pm</div>
        </div>
      </div>
    </aside>
  );
}
