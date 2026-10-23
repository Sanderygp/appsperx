import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geen `output: "standalone"`: Vercel gebruikt zijn eigen
  // build-output. (De dev-sandbox gebruikt standalone voor de
  // lokale productietest; hier is `next start` voldoende.)
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
