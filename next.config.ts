import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices (phones, iPads) to load /_next/* assets during dev.
  // Next 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ["192.168.1.43", "192.168.1.*", "*.local"],
};

export default nextConfig;
