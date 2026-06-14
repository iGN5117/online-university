import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both bottom corners hold floating buttons (companion bottom-right, teacher
  // bottom-left), so hide the dev-only indicator. Compile/runtime errors are
  // still surfaced by Next.
  devIndicators: false,
};

export default nextConfig;
