/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // We use a custom /img proxy for WP media, so disable Next/image processing.
    unoptimized: true,
  },
  // Allow WP-rendered HTML to include any markup the Hatch blocks runtime hydrates.
  experimental: {},
};

export default nextConfig;
