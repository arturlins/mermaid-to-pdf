import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', '@mermaid-js/mermaid-cli'],
  outputFileTracingIncludes: {
    '/api/convert': [
      './node_modules/@mermaid-js/mermaid-cli/**/*',
      './node_modules/commander/**/*',
      './node_modules/puppeteer/**/*',
      './node_modules/chalk/**/*',
    ],
  },
};

export default nextConfig;
