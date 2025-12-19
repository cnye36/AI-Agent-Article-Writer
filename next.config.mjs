import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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

    // Fix for eventsource-parser/stream subpath export resolution
    // This ensures webpack can resolve the /stream subpath export
    try {
      const streamPath = require.resolve('eventsource-parser/stream');
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'eventsource-parser/stream': streamPath,
      };
    } catch (e) {
      // Fallback if resolution fails - webpack should still try to resolve it
      console.warn('Could not resolve eventsource-parser/stream:', e);
    }

    // Optimize cache for large strings (reduces serialization warnings)
    if (config.cache) {
      config.cache.maxMemoryGenerations = 1;
      config.cache.maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    }

    // Exclude unnecessary files from webpack processing
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Optimize module resolution
    config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])];

    // Reduce bundle size by excluding large dependencies from client bundle when possible
    if (!isServer) {
      config.externals = config.externals || [];
    }

    return config;
  },
};

export default nextConfig;
