import type { NextConfig } from "next";
import { NO_STORE_HEADERS } from "./lib/http/no-store";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: Object.entries(NO_STORE_HEADERS).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
