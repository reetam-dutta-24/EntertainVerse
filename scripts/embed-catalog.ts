/**
 * Embed the whole catalog for the recommender (only new/changed items are sent).
 *
 *   npm run embed:catalog            # incremental
 *   npm run embed:catalog -- --force # re-embed everything (e.g. after changing the text format)
 */
import { prisma } from "@/lib/prisma";
import { syncCatalogEmbeddings } from "@/lib/recommender/embeddings";

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set — add it to .env.local first.");
    process.exit(1);
  }
  const started = Date.now();
  const result = await syncCatalogEmbeddings({
    force: process.argv.includes("--force"),
    onProgress: (done, total) => console.log(`  embedded ${done}/${total}`),
  });
  console.log(
    `Done in ${((Date.now() - started) / 1000).toFixed(1)}s — ${result.embedded} embedded, ` +
      `${result.unchanged} unchanged, ${result.removed} removed.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
