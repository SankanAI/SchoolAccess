import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",  // Keep this for GitHub Pages
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['raw.githubusercontent.com', 'github.com'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/SchoolAccess/' : '',
  basePath: process.env.NODE_ENV === 'production' ? '/SchoolAccess' : '',
};

export default nextConfig;