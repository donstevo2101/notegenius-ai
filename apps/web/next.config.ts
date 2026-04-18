import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["assemblyai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
