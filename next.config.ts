import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', '@mermaid-js/mermaid-cli'],
  outputFileTracingIncludes: {
    '/api/convert': ['./node_modules/@mermaid-js/mermaid-cli/**/*'],
  },
};
export default nextConfig;
