import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

function getFirebaseConfig() {
  // Firebase App Hosting fournit FIREBASE_WEBAPP_CONFIG (disponible au BUILD et RUNTIME côté serveur)
  if (typeof process !== "undefined" && process.env?.FIREBASE_WEBAPP_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
      console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", e);
    }
  }

  // Fallback sur les variables d'environnement individuelles
  const config = {
    apiKey: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_API_KEY : undefined,
    authDomain: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined,
    projectId: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined,
    storageBucket: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
    messagingSenderId: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
    appId: typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_FIREBASE_APP_ID : undefined,
  };

  // Si aucune variable d'environnement n'est disponible, utiliser les valeurs par défaut
  // Ces valeurs sont publiques et peuvent être exposées côté client
  if (!config.apiKey || !config.projectId) {
    // Configuration Firebase pour sqyping-teamup (valeurs publiques)
    return {
      apiKey: "AIzaSyC9fsfuDqF0jjV8ocgCtqMpcPA-E6pZoNg",
      authDomain: "sqyping-teamup.firebaseapp.com",
      projectId: "sqyping-teamup",
      storageBucket: "sqyping-teamup.firebasestorage.app",
      messagingSenderId: "567392028186",
      appId: "1:567392028186:web:0fa11cf39ce060931eb3a3",
    };
  }

  return config;
}

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function initializeFirebase() {
  if (app) {
    return { app, auth: authInstance!, db: dbInstance!, storage: storageInstance! };
  }

  const firebaseConfig = getFirebaseConfig();

  // Vérifier que la configuration est valide avant d'initialiser
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Firebase configuration is missing. Please check your environment variables."
    );
  }

  // Initialiser Firebase uniquement s'il n'est pas déjà initialisé
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  // Initialiser les services Firebase
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);

  return { app, auth: authInstance, db: dbInstance, storage: storageInstance };
}

// Helper pour vérifier si on est en mode build statique
function isStaticBuild(): boolean {
  return (
    typeof window === "undefined" &&
    !process.env.NEXT_RUNTIME &&
    process.env.NODE_ENV === "production"
  );
}

// Fonctions getter pour une initialisation lazy
function getApp(): FirebaseApp {
  if (isStaticBuild()) {
    throw new Error("Firebase cannot be initialized during static build");
  }
  if (!app) {
    const initialized = initializeFirebase();
    app = initialized.app;
    authInstance = initialized.auth;
    dbInstance = initialized.db;
    storageInstance = initialized.storage;
  }
  return app;
}

function getAuthInstance(): Auth {
  if (isStaticBuild()) {
    throw new Error("Firebase Auth cannot be accessed during static build");
  }
  if (!authInstance) {
    const initialized = initializeFirebase();
    authInstance = initialized.auth;
    dbInstance = initialized.db;
    storageInstance = initialized.storage;
    app = initialized.app;
  }
  return authInstance;
}

function getDbInstance(): Firestore {
  if (isStaticBuild()) {
    throw new Error("Firebase Firestore cannot be accessed during static build");
  }
  if (!dbInstance) {
    const initialized = initializeFirebase();
    dbInstance = initialized.db;
    authInstance = initialized.auth;
    storageInstance = initialized.storage;
    app = initialized.app;
  }
  return dbInstance;
}

function getStorageInstance(): FirebaseStorage {
  if (isStaticBuild()) {
    throw new Error("Firebase Storage cannot be accessed during static build");
  }
  if (!storageInstance) {
    const initialized = initializeFirebase();
    storageInstance = initialized.storage;
    authInstance = initialized.auth;
    dbInstance = initialized.db;
    app = initialized.app;
  }
  return storageInstance;
}

// Exporter les getters publics
export function getFirebaseApp(): FirebaseApp {
  return getApp();
}

export function getFirebaseAuth(): Auth {
  return getAuthInstance();
}

export function getFirebaseDb(): Firestore {
  return getDbInstance();
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorageInstance();
}

// Exporter les instances pour compatibilité avec le code existant
// Utiliser des Proxies pour une initialisation lazy
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (isStaticBuild()) {
      return undefined;
    }
    return getAuthInstance()[prop as keyof Auth];
  },
}) as Auth;

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (isStaticBuild()) {
      return undefined;
    }
    return getDbInstance()[prop as keyof Firestore];
  },
}) as Firestore;

export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    if (isStaticBuild()) {
      return undefined;
    }
    return getStorageInstance()[prop as keyof FirebaseStorage];
  },
}) as FirebaseStorage;

// Configuration Firestore
if (typeof window !== "undefined") {
  console.log("🔥 Configuration Firebase:", {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_WEBAPP_CONFIG ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || "{}").projectId : undefined,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_WEBAPP_CONFIG ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || "{}").authDomain : undefined,
  });
}

export default (() => {
  if (isStaticBuild()) {
    return {} as FirebaseApp;
  }
  return app || getApp();
})();
