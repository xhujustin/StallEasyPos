import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://172.17.160.1:3000"],
};

export default nextConfig;
