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
    return config;
  },
};

export default nextConfig;
