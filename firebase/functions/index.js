// firebase/functions/index.js
/**
 * Firebase Cloud Functions
 * - trackAnalytics: Triggered on new chat sessions → updates analytics counters
 * - onNewUser: Triggered on new user creation → sends welcome notification
 * - scheduledRollRevision: Daily cron → checks for upcoming electoral roll revision campaigns
 * - exportAnalytics: Admin-callable function to export platform stats
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ─── Track Analytics on new chat message ─────────────────────────────────────
exports.trackChatAnalytics = functions.firestore
  .document("chatSessions/{sessionId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.role !== "user") return null;

    const statsRef = db.collection("analytics").doc("platform");
    await statsRef.set({
      chatSessions: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    functions.logger.info("Analytics updated for session", context.params.sessionId);
    return null;
  });

// ─── On new user registration ─────────────────────────────────────────────────
exports.onNewUser = functions.firestore
  .document("users/{uid}")
  .onCreate(async (snap, context) => {
    const user = snap.data();
    const uid = context.params.uid;

    // Increment user counter
    await db.collection("analytics").doc("platform").set({
      totalUsers: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

    // Create welcome chat message
    const sessionId = `welcome-${uid}`;
    await db.collection("chatSessions").doc(sessionId).set({
      uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), type: "welcome",
    });

    functions.logger.info(`New user registered: ${uid}`);
    return null;
  });

// ─── On eligibility check ─────────────────────────────────────────────────────
exports.onEligibilityCheck = functions.firestore
  .document("eligibilityChecks/{checkId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    await db.collection("analytics").doc("platform").set({
      eligibilityChecks: admin.firestore.FieldValue.increment(1),
      eligibleCount: data.eligible ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
    }, { merge: true });
    return null;
  });

// ─── Scheduled: Daily election date checker ───────────────────────────────────
exports.dailyElectionCheck = functions.pubsub
  .schedule("0 9 * * *") // 9 AM daily
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    const today = new Date();
    const elections = await db.collection("elections")
      .where("date", ">=", today)
      .where("notified", "==", false)
      .limit(10)
      .get();

    for (const doc of elections.docs) {
      const election = doc.data();
      const daysAway = Math.ceil((election.date.toDate() - today) / (1000 * 60 * 60 * 24));

      if ([30, 15, 7, 1].includes(daysAway)) {
        // In production: send FCM notification to all users
        functions.logger.info(`Election reminder: ${election.name} is ${daysAway} days away`);
        await doc.ref.update({ reminderSentDays: admin.firestore.FieldValue.arrayUnion(daysAway) });
      }
    }
    return null;
  });

// ─── Callable: Export analytics (admin only) ──────────────────────────────────
exports.exportAnalytics = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const statsDoc = await db.collection("analytics").doc("platform").get();
  const topQsSnap = await db.collection("analytics").doc("questions").get();

  return {
    stats: statsDoc.data() || {},
    topQuestions: topQsSnap.data()?.questions || [],
    exportedAt: new Date().toISOString(),
    exportedBy: context.auth.uid,
  };
});
