import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Évite les conflits de cache entre les aperçus locaux.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
