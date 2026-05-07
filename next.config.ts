import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // React 19 features
  },
  // Ensure API routes work on Vercel free tier
  serverExternalPackages: ["@google/generative-ai"],
};

export default nextConfig;
