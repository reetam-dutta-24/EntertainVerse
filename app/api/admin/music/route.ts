import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireMusicAdminApi } from "@/lib/admin-auth";
import {
  MusicConflictError,
  createCatalogTrack,
  isUniqueSlugError,
  listCatalogTracks,
} from "@/lib/services/music.service";
import { musicFormSchema } from "@/lib/validators/admin/music";

/** GET /api/admin/music */
export async function GET(request: Request) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const result = await listCatalogTracks({
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 20),
  });
  return NextResponse.json(result);
}

/** POST /api/admin/music */
export async function POST(request: Request) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  try {
    const body = await request.json();
    const parsed = musicFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await createCatalogTrack(parsed.data);
    return NextResponse.json({ recordId: row?.id, slug: row?.slug }, { status: 201 });
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json({ error: new MusicConflictError().message }, { status: 409 });
    }
    console.error("[admin/music POST]", error);
    return NextResponse.json({ error: "Could not create track." }, { status: 500 });
  }
}
