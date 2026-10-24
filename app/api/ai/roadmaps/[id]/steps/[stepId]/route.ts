import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { RoadmapNotFoundError, replaceRoadmapStep, updateRoadmapStep } from "@/lib/services/roadmap.service";

type RouteContext = { params: Promise<{ id: string; stepId: string }> };

const bodySchema = z.object({ action: z.enum(["done", "undo", "drop", "replace"]) });

/** PATCH /api/ai/roadmaps/:id/steps/:stepId — mark done / undo / drop, or swap for a new match. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const { id, stepId } = await context.params;
  try {
    const roadmap =
      parsed.data.action === "replace"
        ? await replaceRoadmapStep(auth.userId, id, stepId)
        : await updateRoadmapStep(auth.userId, id, stepId, parsed.data.action);
    return NextResponse.json({ roadmap });
  } catch (error) {
    if (error instanceof RoadmapNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't update the step." }, { status: 409 });
  }
}
