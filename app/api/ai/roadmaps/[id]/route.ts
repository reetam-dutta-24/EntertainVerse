import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { archiveRoadmap } from "@/lib/services/roadmap.service";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/ai/roadmaps/:id — archive a roadmap (history is kept). */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const { id } = await context.params;
  await archiveRoadmap(auth.userId, id);
  return NextResponse.json({ ok: true });
}
