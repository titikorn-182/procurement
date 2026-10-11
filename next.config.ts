import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 2 MiB catalog images plus multipart overhead, below the hosting body limit.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
