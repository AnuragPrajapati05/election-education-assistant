// src/services/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

// Load from environment variables - never hardcode keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app, auth, db, analytics, googleProvider;

// Gracefully handle missing config (demo mode)
try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
    googleProvider = new GoogleAuthProvider();
  }
} catch (err) {
  console.warn("Firebase not configured - running in demo mode");
}

//  Auth Helpers

export const signIn = async (email, password) => {
  if (!auth) return mockUser(email);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const signUp = async (email, password, displayName) => {
  if (!auth) return mockUser(email, displayName);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    displayName,
    role: "user",
    createdAt: serverTimestamp(),
    preferences: { language: "en", highContrast: false },
  });
  return cred.user;
};

export const signInWithGoogle = async () => {
  if (!auth) return mockUser("demo@google.com", "Demo User");
  const result = await signInWithPopup(auth, googleProvider);
  const userDoc = await getDoc(doc(db, "users", result.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(db, "users", result.user.uid), {
      email: result.user.email,
      displayName: result.user.displayName,
      role: "user",
      createdAt: serverTimestamp(),
      preferences: { language: "en", highContrast: false },
    });
  }
  return result.user;
};

export const logOut = async () => {
  if (auth) await signOut(auth);
};

export const onAuthChange = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

//  Firestore Helpers

export const getUserProfile = async (uid) => {
  if (!db) return { role: "user", preferences: {} };
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const saveChatMessage = async (uid, sessionId, message) => {
  if (!db) return;
  await addDoc(collection(db, "chatSessions", sessionId, "messages"), {
    uid,
    ...message,
    timestamp: serverTimestamp(),
  });
};

export const getChatHistory = async (uid, limitN = 50) => {
  if (!db) return [];
  const q = query(
    collection(db, "chatSessions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(limitN)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const saveEligibilityCheck = async (uid, result) => {
  if (!db) return;
  await addDoc(collection(db, "eligibilityChecks"), {
    uid,
    ...result,
    timestamp: serverTimestamp(),
  });
};

export const getAnalyticsStats = async () => {
  if (!db) return mockAnalytics();
  const snap = await getDocs(collection(db, "analytics"));
  return snap.docs.map((d) => d.data());
};

//  Analytics

export const trackEvent = (name, params = {}) => {
  if (analytics) logEvent(analytics, name, params);
};

//  Mock helpers for demo mode

const mockUser = (email, displayName = "Demo User") => ({
  uid: "demo-uid-123",
  email,
  displayName,
  photoURL: null,
});

const mockAnalytics = () => ({
  totalUsers: 1247,
  chatSessions: 3891,
  avgEngagement: "4m 32s",
  topQuestions: ["How to register?", "Eligibility requirements", "Where to vote"],
});

export { auth, db };
