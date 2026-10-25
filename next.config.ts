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
    // The project lives in a OneDrive folder: OneDrive locks files while Turbopack's on-disk
    // dev cache writes them, which corrupted the cache (routes deeper than two segments 404'd)
    // and grew it to 28 GB. Dev compiles from scratch instead.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
