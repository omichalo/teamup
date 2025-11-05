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
};

export default nextConfig;
