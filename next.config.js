/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/v1/chat/completions",
        destination: "/api/chat",
      },
    ];
  },
}

module.exports = nextConfig
