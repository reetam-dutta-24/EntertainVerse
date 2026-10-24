import "server-only";

import { asCatalogAiError } from "@/lib/ai/errors";
import type { AiStreamEvent, ProgressReporter } from "@/lib/ai/progress-types";

/**
 * Run a long AI task and stream its progress as NDJSON, ending with either a
 * `result` or an `error` line. Lets the admin UI show real step-by-step progress.
 */
export function streamAiTask<T>(label: string, run: (report: ProgressReporter) => Promise<T>) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AiStreamEvent<T>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const data = await run((step) => send({ type: "progress", ...step }));
        send({ type: "result", data });
      } catch (error) {
        const aiError = asCatalogAiError(error);
        console.error(`[${label}]`, error);
        send({ type: "error", message: aiError.message, status: aiError.status });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Stop proxies from buffering the stream so progress arrives live.
      "x-accel-buffering": "no",
    },
  });
}
