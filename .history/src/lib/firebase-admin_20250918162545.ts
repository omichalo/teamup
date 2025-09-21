import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let admin: any = null;

export async function initializeFirebaseAdmin() {
  if (admin) {
    return admin;
  }

  try {
    // Vérifier si Firebase Admin est déjà initialisé
    if (getApps().length === 0) {
      // En développement local, utiliser l'émulateur Firebase si disponible
      if (process.env.NODE_ENV === "development") {
        console.log("🔧 Mode développement: utilisation de l'émulateur Firebase");
        
        // Configuration pour l'émulateur Firebase
        admin = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "sqyping-teamup",
        });
        
        // Configurer Firestore pour utiliser l'émulateur
        const db = getFirestore(admin);
        db.settings({
          host: "localhost:8080",
          ssl: false,
        });
        
        return admin;
      }

      // Configuration Firebase Admin pour la production
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "sqyping-teamup",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      };

      admin = initializeApp({
        credential: cert(serviceAccount as any),
        projectId: process.env.FIREBASE_PROJECT_ID || "sqyping-teamup",
      });
    } else {
      admin = getApps()[0];
    }

    return admin;
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'initialisation de Firebase Admin:",
      error
    );
    throw error;
  }
}

export function getFirebaseAdmin() {
  if (!admin) {
    throw new Error(
      "Firebase Admin n'est pas initialisé. Appelez initializeFirebaseAdmin() d'abord."
    );
  }
  return admin;
}

export function getFirestoreAdmin() {
  const admin = getFirebaseAdmin();
  return getFirestore(admin);
}
