import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.loyverse.com',
        pathname: '/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
    // Sentry organization/project slug from sentry.io
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only upload source maps in CI/Vercel (set SENTRY_AUTH_TOKEN in Vercel env)
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Disable source map upload if auth token not set (local dev)
    silent: !process.env.SENTRY_AUTH_TOKEN,

    // Tree-shake Sentry debug code from client bundle
    disableLogger: true,

    // Hides source map upload progress
    hideSourceMaps: true,
});
