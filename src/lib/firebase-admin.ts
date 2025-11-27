import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

// Initialiser Firebase Admin (une seule fois)
const app = (() => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
    process.env.GCLOUD_PROJECT || 
    process.env.GOOGLE_CLOUD_PROJECT || 
    "sqyping-teamup";

  // Vérifier si un fichier de service account est spécifié via GOOGLE_APPLICATION_CREDENTIALS
  const rawServiceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountPath = rawServiceAccountPath?.trim().replace(/^["']|["']$/g, "");
  
  // Si GOOGLE_APPLICATION_CREDENTIALS n'est pas défini, on est probablement sur Google Cloud
  // (App Hosting, Cloud Run, etc.) où les Application Default Credentials sont disponibles
  if (!serviceAccountPath) {
    // Log uniquement en mode debug
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("🔥 Initialisation Firebase Admin avec Application Default Credentials (Google Cloud)");
    }
    try {
      return initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation avec Application Default Credentials:", error);
      // Continue avec les autres méthodes
    }
  }
  
  // Si GOOGLE_APPLICATION_CREDENTIALS est défini, on est probablement en local
  // Lire le fichier de service account
  if (serviceAccountPath) {
    // Log uniquement en mode debug (sans exposer le chemin complet)
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("🔥 Initialisation Firebase Admin avec fichier service account (chemin masqué)");
    }
    try {
      // Lire directement le fichier JSON au lieu d'utiliser applicationDefault()
      // qui essaie de se connecter à metadata.google.internal
      const resolvedPath = path.isAbsolute(serviceAccountPath) 
        ? serviceAccountPath 
        : path.resolve(process.cwd(), serviceAccountPath);
      
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Service account file not found`);
      }

      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
      const serviceAccountProjectId = serviceAccount.project_id || projectId;
      
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccountProjectId,
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
  const explicitProjectId =
    process.env.FB_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    projectId;

  if (privateKey && clientEmail) {
    // Log uniquement en mode debug (sans exposer la présence de la clé privée)
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("🔥 Initialisation Firebase Admin avec credentials explicites (variables d'environnement)");
    }
    return initializeApp({
      credential: cert({
        projectId: explicitProjectId,
        clientEmail,
        privateKey,
      }),
      projectId: explicitProjectId,
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
