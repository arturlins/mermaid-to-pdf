import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', '@mermaid-js/mermaid-cli'],
  outputFileTracingIncludes: {
    '/api/convert': [
      './node_modules/@mermaid-js/mermaid-cli/**/*',
      './node_modules/commander/**/*',
      './node_modules/puppeteer/**/*',
      './node_modules/chalk/**/*',
      './node_modules/import-meta-resolve/**/*',
      './node_modules/cosmiconfig/**/*',
      './node_modules/@puppeteer/**/*',
      './node_modules/ws/**/*',
      './node_modules/devtools-protocol/**/*',
      './node_modules/progress/**/*',
      './node_modules/debug/**/*',
      './node_modules/extract-zip/**/*',
      './node_modules/proxy-agent/**/*',
      './node_modules/tar-fs/**/*',
      './node_modules/unbzip2-stream/**/*',
      './node_modules/yargs/**/*',
      './node_modules/semver/**/*',
      './node_modules/yargs-parser/**/*',
      './node_modules/cliui/**/*',
      './node_modules/escalade/**/*',
      './node_modules/get-caller-file/**/*',
      './node_modules/require-directory/**/*',
      './node_modules/string-width/**/*',
      './node_modules/y18n/**/*',
      // Proxy & Network Dependencies (for puppeteer -> proxy-agent)
      './node_modules/agent-base/**/*',
      './node_modules/http-proxy-agent/**/*',
      './node_modules/https-proxy-agent/**/*',
      './node_modules/lru-cache/**/*',
      './node_modules/pac-proxy-agent/**/*',
      './node_modules/proxy-from-env/**/*',
      './node_modules/socks-proxy-agent/**/*',
      './node_modules/netmask/**/*',
      './node_modules/ip/**/*',
      './node_modules/smart-buffer/**/*',
      './node_modules/socks/**/*',
      './node_modules/data-uri-to-buffer/**/*',
    ],
  },
};

export default nextConfig;
