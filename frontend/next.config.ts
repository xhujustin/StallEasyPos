import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "172.17.160.1:3000",
    "192.168.2.221:3000",
    "192.168.2.221",
    "0.0.0.0:3000"
  ],
  productionBrowserSourceMaps: false,
};

export default nextConfig;
