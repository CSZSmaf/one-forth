import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: [
    "@one-forth/config",
    "@one-forth/content",
    "@one-forth/knowledge-graph",
    "@one-forth/math-core",
    "@one-forth/numerical",
    "@one-forth/physics",
    "@one-forth/registry",
    "@one-forth/search",
    "@one-forth/simulation-runtime",
    "@one-forth/ui",
    "@one-forth/visualization",
  ],
};

export default nextConfig;
