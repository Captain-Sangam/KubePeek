/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ['@kubernetes/client-node'],
  output: 'standalone', // Enable standalone output for Docker
  
  // Configure webpack to handle Node.js modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load these Node.js modules in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        child_process: false,
        net: false,
        tls: false,
        https: false,
        http: false,
        stream: false,
        crypto: false,
        zlib: false,
        util: false,
        url: false,
        querystring: false
      };
    }
    return config;
  },
  
  // Add transpilePackages to ensure proper handling of dependencies
  transpilePackages: ['@kubernetes/client-node']
};

module.exports = nextConfig; 