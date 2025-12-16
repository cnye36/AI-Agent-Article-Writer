/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // We'll fix type errors, but allow build to continue during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow build to continue with lint errors during development
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Fix for pnpm's nested node_modules structure
    config.resolve.symlinks = false;

    // Optimize cache for large strings (reduces serialization warnings)
    if (config.cache) {
      config.cache.maxMemoryGenerations = 1;
      config.cache.maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    }

    return config;
  },
};

export default nextConfig;
