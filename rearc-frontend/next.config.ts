import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Static HTML export for Cloudflare Pages
  devIndicators: false,
  // Cloudflare Pages compatibility
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
