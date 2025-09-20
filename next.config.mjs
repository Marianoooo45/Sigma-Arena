/** @type {import('next').NextConfig} */
const config = { /* … */ };
export default {
  images: {
    formats: ['image/avif','image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920, 2048, 2560, 3200, 3840, 4096, 5120],
  },
};