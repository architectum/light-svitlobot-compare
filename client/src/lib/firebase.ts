import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";
import { getAnalytics, isSupported } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCf_bauCo2gElBXg-oXtW6_Ap-Jir5TZFE",
  authDomain: "svitlobot-compare.firebaseapp.com",
  projectId: "svitlobot-compare",
  storageBucket: "svitlobot-compare.firebasestorage.app",
  messagingSenderId: "870951345205",
  appId: "1:870951345205:web:7392b1aa762379f4f7257c",
  measurementId: "G-45RTBFMSN2",
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
