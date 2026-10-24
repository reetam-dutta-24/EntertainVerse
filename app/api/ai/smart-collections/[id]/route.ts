import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import {
  SmartCollectionNotFoundError,
  acceptSmartCollection,
  dismissSmartCollection,
} from "@/lib/services/smart-collections.service";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE") }),
  z.object({ action: z.literal("dismiss") }),
]);

/** PATCH /api/ai/smart-collections/:id — save an idea as a collection, or dismiss it. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const { id } = await context.params;
  try {
    if (parsed.data.action === "dismiss") {
      await dismissSmartCollection(auth.userId, id);
      return NextResponse.json({ ok: true });
    }
    const saved = await acceptSmartCollection(auth.userId, id, parsed.data.visibility);
    return NextResponse.json({ ok: true, slug: saved.slug });
  } catch (error) {
    if (error instanceof SmartCollectionNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error("[smart collections]", error);
    return NextResponse.json({ error: "Couldn't save the collection." }, { status: 500 });
  }
}
