import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 產生精簡的 standalone server，適合 ARM64 Docker 映像。
  output: "standalone",
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
