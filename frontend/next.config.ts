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
          value: "public, max-age=604800, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default nextConfig;

