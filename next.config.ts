import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Aligné avec `npm run check` : le build échoue si ESLint échoue.
    ignoreDuringBuilds: false,
  },
  // Artefact Docker / App Hosting : serveur Node autonome avec `node server.js`.
  output: "standalone",
  // Identifiant unique par build pour invalider le cache navigateur/CDN entre déploiements.
  generateBuildId: async () => `build-${Date.now()}`,
  // Désactivé par défaut : limite l’exposition du source client en prod. Réactiver ponctuellement
  // pour du debug ou si un outil (ex. Sentry) nécessite des source maps côté navigateur.
  productionBrowserSourceMaps: false,
  // Les variables NEXT_PUBLIC_* sont injectées par Next.js depuis `process.env` au build
  // (.env.local, CI, apphosting.yaml). Ne pas dupliquer de valeurs par défaut ici (voir Epic E).
};

export default nextConfig;
