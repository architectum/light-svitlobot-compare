import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Track if Firebase is properly configured
export let isFirebaseConfigured = false;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    // Full credentials available - initialize with service account
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isFirebaseConfigured = true;
    console.log("Firebase Admin initialized with service account credentials");
  } else {
    // No credentials - running in demo mode
    console.warn(
      "⚠️  Firebase credentials not found. Running in DEMO MODE with mock data.\n" +
      "   To use real Firebase, set these environment variables:\n" +
      "   - FIREBASE_PROJECT_ID\n" +
      "   - FIREBASE_CLIENT_EMAIL\n" +
      "   - FIREBASE_PRIVATE_KEY\n" +
      "   See README.md for instructions on how to get these credentials."
    );
    
    // Initialize with minimal config for demo
    admin.initializeApp({
      projectId: "demo-project",
    });
  }
}

export const firestore = admin.firestore();
