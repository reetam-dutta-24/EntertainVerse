import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { attachSocketServer } from "./lib/socket/server";

const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

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

  await attachSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (Next.js + Socket.IO)`);
    void warmCache();
  });
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
