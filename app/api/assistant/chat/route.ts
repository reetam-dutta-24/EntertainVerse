import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { isAiConfigured } from "@/lib/ai/provider";
import { CatalogAiError } from "@/lib/ai/errors";
import { answerStream } from "@/lib/assistant/answer";
import { retrieve } from "@/lib/assistant/retrieval";
import type { AssistantStreamEvent } from "@/lib/assistant/types";
import { getUserById } from "@/lib/services/user.service";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be the user's."),
  pathname: z.string().max(200).default("/dashboard"),
});

/** Per-user sliding window — protects the shared AI quota. */
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;
const recent = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  // Forget users whose window has fully passed, so the map can't grow with every user ever seen.
  if (recent.size > 500) {
    for (const [id, stamps] of recent) {
      if (now - stamps[stamps.length - 1] >= WINDOW_MS) recent.delete(id);
    }
  }
  const times = (recent.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) return true;
  times.push(now);
  recent.set(userId, times);
  return false;
}

/** POST /api/assistant/chat — retrieval-augmented answer, streamed as NDJSON events. */
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  if (!isAiConfigured()) return NextResponse.json({ error: "The assistant isn't set up on this server yet." }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  if (rateLimited(auth.userId)) {
    return NextResponse.json({ error: "You're asking quickly — give it a few minutes and try again." }, { status: 429 });
  }

  const { messages, pathname } = parsed.data;
  const userQuestions = messages.filter((message) => message.role === "user");
  const question = userQuestions.at(-1)!.content;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantStreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const [user, retrieved] = await Promise.all([getUserById(auth.userId), retrieve(auth.userId, question, userQuestions.at(-2)?.content)]);
        send({ type: "sources", sources: retrieved.sources });
        for await (const text of answerStream(retrieved, messages, user?.name.split(" ")[0] ?? "there", pathname)) {
          if (request.signal.aborted) break;
          send({ type: "delta", text });
        }
        send({ type: "done" });
      } catch (error) {
        console.error("[assistant chat]", error);
        send({
          type: "error",
          message: error instanceof CatalogAiError ? error.message : "The assistant couldn't answer right now — try again in a moment.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
