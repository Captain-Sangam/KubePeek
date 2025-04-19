import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverComponentsExternalPackages: ['@kubernetes/client-node'],
  // output: 'standalone', // Removed standalone output for Docker
};

export default nextConfig;
