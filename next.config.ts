import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_STANDALONE_BUILD === "1" ? { output: "standalone" as const } : {}),
  // Transport-only rewrites. Rust owns these business endpoints; Next has no
  // matching Route Handlers and does not read/write the commerce database.
  async rewrites() {
    // Never expose preview-only commerce paths from a production Next build.
    if (process.env.NODE_ENV === "production" || process.env.SOCTHINK_VOUCHER_PREVIEW !== "1") return [];
    const base = process.env.SOCTHINK_RUST_COMMERCE_INTERNAL_URL || "http://127.0.0.1:37872";
    return [
      { source: "/api/platform/admin/commerce", destination: base + "/api/platform/admin/commerce" },
      { source: "/api/platform/billing/exam-access", destination: base + "/api/platform/billing/exam-access" },
      { source: "/api/platform/billing/redeem", destination: base + "/api/platform/billing/redeem" },
    ];
  },
};

export default nextConfig;
