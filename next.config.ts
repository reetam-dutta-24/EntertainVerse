import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images are served as they are: catalog art and uploads at full quality (see HdImage), and
  // the landing/auth artwork pre-compressed to WebP. Resizing on request costs CPU the app
  // servers need, and after a cold start the optimizer once left a request hanging for good.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
    proxyClientMaxBodySize: "11mb",
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
      {
        // User uploads: never let a browser sniff an image into HTML or script.
        source: "/uploads/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
