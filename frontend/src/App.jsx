import { useState, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import LoadingScreen from "./components/LoadingScreen";
import AuthModal from "./components/AuthModal";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const RegistrationPage = lazy(() => import("./pages/RegistrationPage"));
const EligibilityPage = lazy(() => import("./pages/EligibilityPage"));
const TimelinePage = lazy(() => import("./pages/TimelinePage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const BoothLocatorPage = lazy(() => import("./pages/BoothLocatorPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const PAGES = {
  dashboard: Dashboard,
  assistant: AssistantPage,
  registration: RegistrationPage,
  eligibility: EligibilityPage,
  timeline: TimelinePage,
  calendar: CalendarPage,
  booth: BoothLocatorPage,
  faq: FAQPage,
  admin: AdminPage,
};

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showAuth, setShowAuth] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) return <LoadingScreen />;

  const PageComponent = PAGES[currentPage] || Dashboard;

  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Navbar
        onMenuToggle={() => setSidebarOpen((p) => !p)}
        onAuthClick={() => setShowAuth(true)}
        currentPage={currentPage}
      />
      <div className="app-body">
        <Sidebar
          open={sidebarOpen}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          userRole={user?.role || "guest"}
        />
        <main id="main-content" className={`main-content ${sidebarOpen ? "sidebar-open" : ""}`} tabIndex="-1">
          <Suspense fallback={<LoadingScreen mini />}>
            <PageComponent onNavigate={setCurrentPage} />
          </Suspense>
        </main>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AccessibilityProvider>
          <AppContent />
        </AccessibilityProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
