import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireArtistAdminApi } from "@/lib/admin-auth";
import {
  ArtistConflictError,
  createCatalogArtist,
  isUniqueSlugError,
  listCatalogArtists,
} from "@/lib/services/artist.service";
import { artistFormSchema } from "@/lib/validators/admin/artist";

/** GET /api/admin/artists */
export async function GET(request: Request) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const result = await listCatalogArtists({
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 20),
  });
  return NextResponse.json(result);
}

/** POST /api/admin/artists */
export async function POST(request: Request) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  try {
    const body = await request.json();
    const parsed = artistFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    if (parsed.data.isGroup && parsed.data.members.length === 0) {
      return NextResponse.json(
        { error: "Add at least one band member for a group artist." },
        { status: 400 },
      );
    }
    const row = await createCatalogArtist(parsed.data);
    return NextResponse.json(
      { recordId: row?.id, slug: row?.slug, members: row?.members ?? [] },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json({ error: new ArtistConflictError().message }, { status: 409 });
    }
    console.error("[admin/artists POST]", error);
    return NextResponse.json({ error: "Could not create artist." }, { status: 500 });
  }
}
