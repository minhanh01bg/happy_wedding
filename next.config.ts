import type { NextConfig } from "next";
import { buildCspHeader } from "./src/server/security/csp";

const csp = buildCspHeader({ extraImageOrigins: ["https://img.vietqr.io"] });
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "160.250.247.137"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.vietqr.io" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(csp.headerName && csp.headerValue
            ? [{ key: csp.headerName, value: csp.headerValue }]
            : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
