import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_STANDALONE_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
