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
    // Client router cache: a dashboard page you just left is reused for 30s, so back/forward
    // and tab switches are instant. Mutations call router.refresh(), which bypasses it.
    staleTimes: {
      dynamic: 30,
    },
  },
  // Posters, artwork and uploads are served from /public with `max-age=0` by default.
  // File names don't change in place often, so let browsers keep them for a day.
  async headers() {
    return [
      {
        source: "/:folder(images|uploads)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
