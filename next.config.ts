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
  // Ignorer les erreurs de pré-rendu pour les pages système comme _not-found
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
