import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_STANDALONE_BUILD === "1" ? { output: "standalone" as const } : {}),
  // New domain mutations live in Rust, never in Next.js.
  async rewrites() {
    if (process.env.SOCTHINK_MARKETPLACE_EXAM_MODE !== "1") return [];
    const target = process.env.SOCTHINK_MARKETPLACE_RUST_INTERNAL_URL || "";
    if (!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}$/.test(target))
      throw Error("MARKETPLACE_RUST_LOOPBACK_REQUIRED");
    return [{source:"/api/marketplace/claim",destination:target+"/api/marketplace/claim"}];
  },
};

export default nextConfig;
