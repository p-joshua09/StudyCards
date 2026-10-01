import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // The app accepts files up to 10 MiB; multipart requests need extra room.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
