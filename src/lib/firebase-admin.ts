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

  // Vérifier si un fichier de service account est spécifié via GOOGLE_APPLICATION_CREDENTIALS
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    console.log(`🔥 Initialisation Firebase Admin avec fichier service account: ${serviceAccountPath}`);
    try {
      // Utiliser applicationDefault() qui lit automatiquement GOOGLE_APPLICATION_CREDENTIALS
      return initializeApp({
        credential: applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sqyping-teamup",
      });
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation avec GOOGLE_APPLICATION_CREDENTIALS:", error);
      // Continue avec les autres méthodes
    }
  }

  // Sinon, utiliser les credentials explicites si disponibles
  // Support des deux formats : FB_* (nouveau) et FIREBASE_* (ancien)
  const privateKey =
    process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const projectId =
    process.env.FB_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "sqyping-teamup";

  if (privateKey && clientEmail) {
    console.log("🔥 Initialisation Firebase Admin avec credentials explicites (variables d'environnement)");
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  // Fallback: utiliser les credentials par défaut même en local
  // Cela peut échouer en local si les credentials ne sont pas configurés
  console.log("⚠️ Aucune credential explicite trouvée, tentative d'utilisation des Application Default Credentials");
  try {
    return initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sqyping-teamup",
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Firebase Admin:", error);
    throw new Error(
      "Firebase Admin credentials not configured. " +
      "Pour le développement local, configurez les variables d'environnement FIREBASE_PRIVATE_KEY et FIREBASE_CLIENT_EMAIL, " +
      "ou utilisez 'gcloud auth application-default login' pour configurer les credentials par défaut."
    );
  }
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
