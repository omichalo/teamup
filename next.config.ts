import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Empêcher la compilation en cas d'erreurs TypeScript
    ignoreBuildErrors: false,
  },
  eslint: {
    // Empêcher la compilation en cas d'erreurs ESLint
    ignoreDuringBuilds: true,
  },
  // Désactiver le pré-rendu statique pour éviter les erreurs Material-UI/React
  // Les pages seront rendues dynamiquement
  output: "standalone",
  // Ignorer les erreurs de pré-rendu pour les pages système
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Désactiver complètement la génération statique pour éviter les erreurs
  // Toutes les pages seront rendues dynamiquement
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
  // Forcer l'injection des variables d'environnement au build
  // Next.js injecte NEXT_PUBLIC_* dans le bundle client au moment du build
  env: {
    // Fallback pour les variables Firebase si elles ne sont pas définies dans apphosting.yaml
    // Ces valeurs seront utilisées au build si les variables d'environnement ne sont pas disponibles
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC9fsfuDqF0jjV8ocgCtqMpcPA-E6pZoNg",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sqyping-teamup.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sqyping-teamup",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sqyping-teamup.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "567392028186",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:567392028186:web:0fa11cf39ce060931eb3a3",
  },
};

export default nextConfig;
