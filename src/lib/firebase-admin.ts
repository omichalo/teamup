import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

// Détecter si on est sur Google Cloud (App Hosting, Cloud Run, etc.)
// Sur Google Cloud, on utilise les Application Default Credentials
// Note: On utilise uniquement les variables spécifiques à Google Cloud Runtime
const isGoogleCloud = 
  !!process.env.K_SERVICE || // Cloud Run
  !!process.env.FUNCTION_TARGET; // Cloud Functions

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
  const rawServiceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log("🔍 DEBUG GOOGLE_APPLICATION_CREDENTIALS:", rawServiceAccountPath);
  const serviceAccountPath = rawServiceAccountPath?.trim().replace(/^["']|["']$/g, "");
  if (serviceAccountPath) {
    console.log(`🔥 Initialisation Firebase Admin avec fichier service account: ${serviceAccountPath}`);
    try {
      // Lire directement le fichier JSON au lieu d'utiliser applicationDefault()
      // qui essaie de se connecter à metadata.google.internal
      const resolvedPath = path.isAbsolute(serviceAccountPath) 
        ? serviceAccountPath 
        : path.resolve(process.cwd(), serviceAccountPath);
      
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Service account file not found: ${resolvedPath}`);
      }

      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      const projectId = serviceAccount.project_id || 
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
        "sqyping-teamup";
      
      return initializeApp({
        credential: cert(serviceAccount),
        projectId,
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

  // Aucune credential trouvée - erreur explicite
  console.error("❌ Aucune credential Firebase Admin trouvée");
  throw new Error(
    "Firebase Admin credentials not configured. " +
    "Pour le développement local, configurez l'une des options suivantes:\n" +
    "1. Variables d'environnement: FIREBASE_PRIVATE_KEY et FIREBASE_CLIENT_EMAIL (ou FB_PRIVATE_KEY et FB_CLIENT_EMAIL)\n" +
    "2. Fichier service account: définissez GOOGLE_APPLICATION_CREDENTIALS avec le chemin vers le fichier JSON"
  );
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
