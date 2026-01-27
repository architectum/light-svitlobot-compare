import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  // Check if we have all credentials
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // For development/demo mode without Firebase credentials
    console.warn(
      "Firebase credentials not found. Running in demo mode with mock data."
    );
    // Initialize with a dummy project for demo purposes
    admin.initializeApp({
      projectId: "demo-project",
    });
  }
}

export const firestore = admin.firestore();
export const isFirebaseConfigured = !!(projectId && clientEmail && privateKey);
