import type { NextConfig } from "next";
import { VK_MINIAPP_FRAME_ANCESTORS_CSP } from "./src/server/vkMiniApp";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Content-Security-Policy", value: VK_MINIAPP_FRAME_ANCESTORS_CSP }]
      }
    ];
  }
};

export default nextConfig;
