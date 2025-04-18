import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverComponentsExternalPackages: ['@kubernetes/client-node'],
  output: 'standalone', // Enable standalone output for Docker
};

export default nextConfig;
