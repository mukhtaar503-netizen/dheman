/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev-mode build indicator sits bottom-left and collides with the
  // sidebar's own user chip in the same corner — disable it in local dev.
  devIndicators: false,
};

export default nextConfig;
