import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "api.dicebear.com",
      "storage.googleapis.com",
      // add any other domains you use for images here
    ],
  },
};

export default nextConfig;
