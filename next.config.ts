import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/chat/completions",
        destination: "/api/chat",
      },
      {
        source: "/v1/models",
        destination: "/api/info",
      },
    ];
  },
};

export default nextConfig;
