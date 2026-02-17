import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: false, // ⬅️ DAS IST DER WICHTIGE TEIL
  },
};

export default withPWA({
  dest: "public",
})(nextConfig);
