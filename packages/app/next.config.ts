import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Resolve @noble/hashes from whichever node_modules has it (handles different hoisting in monorepo vs Vercel)
const resolveNobleHashes = () => {
  const candidates = [
    path.resolve(process.cwd(), "../../node_modules/@noble/hashes"),
    path.resolve(process.cwd(), "node_modules/@noble/hashes"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "imagedelivery.net" },
      { hostname: "i.imgur.com" },
      { hostname: "*.cloudfront.net" },
      { hostname: "res.cloudinary.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "pbs.twimg.com" },
      { hostname: "**.ipfs.w3s.link" },
      { hostname: "gateway.pinata.cloud" },
    ],
  },
  reactStrictMode: true,
  typedRoutes: true,
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Exact-match alias only — subpath imports like '@noble/hashes/sha256'
      // need to fall through to normal node resolution so the package's
      // 'exports' field is honored.
      "@noble/hashes$": resolveNobleHashes(),
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },
};

export default nextConfig;
