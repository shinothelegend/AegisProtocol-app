/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Required for wagmi/viem/RainbowKit ESM compatibility
  transpilePackages: ["@rainbow-me/rainbowkit"],

  // Empty turbopack config — Next.js 16 uses Turbopack by default
  // This silences the "webpack config with Turbopack" warning
  turbopack: {},
};

export default nextConfig;
