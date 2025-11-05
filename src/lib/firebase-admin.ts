import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Configuration Firebase Admin
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
};

// Initialiser Firebase Admin (une seule fois)
const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert(firebaseAdminConfig),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      })
    : getApps()[0];

// Exporter l&apos;instance Firebase Admin
export const adminApp = app;

// Exporter l&apos;instance Firestore
export const adminDb = getFirestore(app);

// Exporter l&apos;instance Auth
export const adminAuth = getAuth(app);

// Fonctions d&apos;initialisation pour compatibilité avec l&apos;ancien code
export const initializeFirebaseAdmin = async () => {
  // Firebase Admin est déjà initialisé
  return Promise.resolve();
};

export const getFirestoreAdmin = () => {
  return adminDb;
};

export const getFirebaseAdmin = () => {
  return adminApp;
};
