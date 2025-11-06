import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Détecter si on est sur Google Cloud (App Hosting, Cloud Run, etc.)
// Sur Google Cloud, on utilise les Application Default Credentials
const isGoogleCloud = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 
  process.env.K_SERVICE || process.env.FUNCTION_TARGET || 
  process.env.FIREBASE_CONFIG || process.env.FIREBASE_WEBAPP_CONFIG;

// Initialiser Firebase Admin (une seule fois)
const app = (() => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Sur Google Cloud (App Hosting), utiliser les credentials par défaut
  if (isGoogleCloud) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
      process.env.GCLOUD_PROJECT || 
      process.env.GOOGLE_CLOUD_PROJECT || 
      "sqyping-teamup";
    console.log("🔥 Initialisation Firebase Admin avec Application Default Credentials (Google Cloud)");
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  // Sinon, utiliser les credentials explicites si disponibles
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    console.log("🔥 Initialisation Firebase Admin avec credentials explicites");
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail,
        privateKey,
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    });
  }

  // Fallback: utiliser les credentials par défaut même en local
  console.log("⚠️ Aucune credential explicite trouvée, utilisation des Application Default Credentials");
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sqyping-teamup",
  });
})();

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
