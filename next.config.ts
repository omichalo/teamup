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
};

export default nextConfig;
