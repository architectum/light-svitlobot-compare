import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";
import { getAnalytics, isSupported } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID as string,
};


export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export const getAnalyticsInstance = () => {
  if (analyticsPromise) {
    return analyticsPromise;
  }

  if (typeof window === "undefined") {
    analyticsPromise = Promise.resolve(null);
    return analyticsPromise;
  }

  analyticsPromise = isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null));
  return analyticsPromise;
};
