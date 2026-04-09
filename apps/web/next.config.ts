import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages deploys to /<repo-name>/ subdirectory
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "/ai-poetry-wbuddy",
  // Required for static export
  images: {
    unoptimized: true,
  },
  // Disable trailing slash for clean URLs
  trailingSlash: false,
};

export default nextConfig;
