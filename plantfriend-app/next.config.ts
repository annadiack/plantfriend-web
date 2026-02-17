import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // <- silences the Next 16 turbopack/webpack warning
};

export default nextConfig;
