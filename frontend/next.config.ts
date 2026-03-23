import type { NextConfig } from "next";

const nextConfig: any = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: async () => [
    {
      source: "/:all*(png|jpg|jpeg|gif|webp|svg|ico)",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      ],
    },
  ],
};

export default nextConfig;
