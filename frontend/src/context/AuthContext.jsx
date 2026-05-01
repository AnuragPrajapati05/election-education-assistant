// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { onAuthChange, getUserProfile, trackEvent } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const prof = await getUserProfile(firebaseUser.uid);
          setUser({ ...firebaseUser, role: prof?.role || "user" });
          setProfile(prof || {});
          trackEvent("user_session_start", { uid: firebaseUser.uid });
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state error:", err);
        setError(err.message);
        // Still set user from Firebase even if profile fetch fails
        setUser(firebaseUser ? { ...firebaseUser, role: "user" } : null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
