import type { NextConfig } from "next";

// newapp:publish-managed
// This config is rewritten by skills/newapp/scripts/publish.py.
// The env vars below let the same file work for dev (npm run dev) and
// for static-export publishing (NEXT_OUTPUT=export npm run build).
const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "export" ? "export" : undefined,
  basePath: process.env.NEXT_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
  // Allow LAN devices (phones, iPads) to load /_next/* assets during dev.
  // Next 16 blocks cross-origin dev requests by default.
  allowedDevOrigins: ["192.168.1.43", "192.168.1.*", "*.local"],
};

export default nextConfig;
