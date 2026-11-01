import type { NextConfig } from "next";
import { buildCspHeader } from "./src/server/security/csp";
import { MAP_FRAME_ORIGINS } from "./src/lib/event-map";

const csp = buildCspHeader({
  extraImageOrigins: ["https://img.vietqr.io"],
  // Bản đồ nhúng ở “Đường đến tiệc” (ADR 0009).
  extraFrameOrigins: MAP_FRAME_ORIGINS,
});
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "160.250.247.137"],
  // The live invitation runs under `next dev`, so guests would see the
  // Dev Tools "N" button. Compile and runtime errors still surface.
  devIndicators: false,
  images: {
    // Default list minus 3840. Uploads keep full resolution (up to 64 MP), and a
    // 3840-wide variant of a 45 MP photo took 6 s against the optimizer's 7 s
    // timeout, after which Next serves the whole original file (ADR 0008).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
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
