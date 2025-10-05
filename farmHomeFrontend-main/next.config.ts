import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { config } from './config';

// Parse backendUrl for protocol, hostname, port
const url = new URL(config.backendUrl);
const protocol = url.protocol.replace(':', '') as 'http' | 'https';
const hostname = url.hostname;
const port = url.port || '';

// NOTE: If you change backendUrl in config.ts, you must restart the dev server for next.config.ts to pick up the new value.

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol,
        hostname,
        port,
        pathname: '/uploads/**',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);