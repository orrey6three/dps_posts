import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: process.env.NODE_ENV === "production",
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://vk.com https://*.vk.com https://vk.ru https://*.vk.ru https://m.vk.com https://m.vk.ru https://*.vk.me https://vk-apps.com https://*.vk-apps.com"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
