/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ['@kubernetes/client-node'],
  output: 'standalone', // Enable standalone output for Docker
};

module.exports = nextConfig; 