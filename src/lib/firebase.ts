import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

function getFirebaseConfig() {
  // Firebase App Hosting fournit FIREBASE_WEBAPP_CONFIG (disponible au BUILD et RUNTIME côté serveur)
  if (typeof process !== "undefined" && process.env?.FIREBASE_WEBAPP_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", e);
    }
  }

  // Fallback sur les variables d'environnement individuelles
  // Note: Next.js remplace process.env.NEXT_PUBLIC_* au build, mais peut être undefined
  const getEnvVar = (key: string): string | undefined => {
    if (typeof process === "undefined") return undefined;
    // Next.js injecte process.env même côté client, mais les valeurs peuvent être undefined ou vides
    const value = process.env?.[key];
    return value && value.trim() !== "" ? value : undefined;
  };

  const config = {
    apiKey: getEnvVar("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getEnvVar("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnvVar("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getEnvVar("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnvVar("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnvVar("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };

  // Si aucune variable d'environnement n'est disponible (undefined ou vide), utiliser les valeurs par défaut
  // Ces valeurs sont publiques et peuvent être exposées côté client
  if (!config.apiKey || !config.projectId || config.apiKey.trim() === "" || config.projectId.trim() === "") {
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
    return {
      app,
      auth: authInstance!,
      db: dbInstance!,
      storage: storageInstance!,
    };
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
    throw new Error(
      "Firebase Firestore cannot be accessed during static build"
    );
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
      throw new Error("Firebase Firestore cannot be accessed during static build");
    }
    try {
      const instance = getDbInstance();
      if (!instance) {
        throw new Error("Firebase Firestore instance is not initialized");
      }
      const value = instance[prop as keyof Firestore];
      // Si la propriété est une fonction, bind le contexte
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    } catch (error) {
      console.error("Error accessing Firestore:", error);
      throw error;
    }
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

// Configuration Firestore - Log de debug côté client
if (typeof window !== "undefined") {
  const config = getFirebaseConfig();
  console.log("🔥 Configuration Firebase:", {
    projectId: config.projectId,
    authDomain: config.authDomain,
    apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : undefined,
  });
}

export default (() => {
  if (isStaticBuild()) {
    return {} as FirebaseApp;
  }
  return app || getApp();
})();
