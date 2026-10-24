import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireMusicAdminApi } from "@/lib/admin-auth";
import {
  MusicConflictError,
  deleteCatalogTrack,
  getTrackRecordById,
  isUniqueSlugError,
  trackRecordToFormInput,
  updateCatalogTrack,
} from "@/lib/services/music.service";
import { musicFormSchema } from "@/lib/validators/admin/music";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  const row = await getTrackRecordById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ record: trackRecordToFormInput(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = musicFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await updateCatalogTrack(id, parsed.data);
    return NextResponse.json({ slug: row?.slug });
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json({ error: new MusicConflictError().message }, { status: 409 });
    }
    console.error("[admin/music PATCH]", error);
    return NextResponse.json({ error: "Could not update track." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    await deleteCatalogTrack(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/music DELETE]", error);
    return NextResponse.json({ error: "Could not delete track." }, { status: 500 });
  }
}
