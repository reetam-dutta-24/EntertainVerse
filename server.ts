import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { attachSocketServer } from "./lib/socket/server";
import { startCacheSync } from "./lib/cache/server-cache";
import { shutDown } from "./lib/server-lifecycle";

const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";
// On shutdown, how long to keep serving after the health check starts failing, so the load
// balancer notices (its checks run every few seconds) before this server stops answering.
const drainMs = Number(process.env.SHUTDOWN_DRAIN_MS ?? (dev ? 0 : 10_000));

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error("Error handling request", error);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = await attachSocketServer(httpServer);
  // With several servers, a write on one must clear the cache on all of them.
  if (await startCacheSync()) console.log("> Cache: invalidations shared through Redis");

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (Next.js + Socket.IO)`);
    void warmCache();
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      console.log(`> ${signal}: health check now fails; closing in ${drainMs / 1000}s`);
      // Never hang forever on a stuck connection.
      setTimeout(() => {
        console.error("> Shutdown took too long — exiting anyway");
        process.exit(1);
      }, drainMs + 10_000).unref();
      void shutDown(io, drainMs).then(() => {
        console.log("> Shut down cleanly");
        process.exit(0);
      });
    });
  }
});

/** Fill the shared server cache (catalog, embeddings, collaborative graph) before the first visitor. */
async function warmCache() {
  // Same process as Next, so the route sees this per-boot token; nobody else can trigger it.
  const token = randomUUID();
  process.env.CACHE_WARMUP_TOKEN = token;
  try {
    const response = await fetch(`http://localhost:${port}/api/internal/warm`, { headers: { "x-warmup-token": token } });
    const body = (await response.json()) as { ms?: number; entries?: number };
    if (response.ok) console.log(`> Cache warmed in ${body.ms}ms (${body.entries} entries)`);
  } catch (error) {
    console.warn("> Cache warm-up skipped:", error instanceof Error ? error.message : error);
  }
}
