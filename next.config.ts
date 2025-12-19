import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Externalize puppeteer packages to avoid Turbopack bundling issues
    serverExternalPackages: [
        'puppeteer',
        'puppeteer-core',
        '@sparticuz/chromium-min',
    ],
};
export default nextConfig;
