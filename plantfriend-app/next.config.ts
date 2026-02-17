import withPWA from "next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // 👈 DAS ist der Fix in Next 16
};

export default withPWA({
  dest: "public",
})(nextConfig);
