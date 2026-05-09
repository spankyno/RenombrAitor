import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React StrictMode to prevent double-invocation of effects/fetches
  // in development that can exhaust API rate limits during testing.
  reactStrictMode: false,
  experimental: {
    // React 19 features
  },
};

export default nextConfig;
