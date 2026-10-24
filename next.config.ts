import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
    proxyClientMaxBodySize: "11mb",
    // Catalog detail pages prerender from Postgres; each build worker opens its own
    // Prisma pool, so keep workers few to stay under the server's connection limit.
    staticGenerationMinPagesPerWorker: 200,
    staticGenerationMaxConcurrency: 4,
    staticGenerationRetryCount: 2,
  },
};

export default nextConfig;
