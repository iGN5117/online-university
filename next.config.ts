import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both bottom corners hold floating buttons (companion bottom-right, teacher
  // bottom-left), so hide the dev-only indicator. Compile/runtime errors are
  // still surfaced by Next.
  devIndicators: false,
  // Emit a self-contained server bundle (.next/standalone) for the Docker
  // deploy. better-sqlite3 is auto-externalized by Next, so its native module
  // is required at runtime rather than bundled.
  output: "standalone",
};

export default nextConfig;
