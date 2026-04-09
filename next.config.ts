import type { NextConfig } from "next";

// @ts-expect-error - next-pwa does not have perfect type definitions
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

const pwa = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default pwa(nextConfig);
