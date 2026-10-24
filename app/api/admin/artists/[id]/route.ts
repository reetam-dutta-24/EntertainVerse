import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireArtistAdminApi } from "@/lib/admin-auth";
import {
  ArtistConflictError,
  artistRecordToFormInput,
  deleteCatalogArtist,
  getArtistRecordById,
  isUniqueSlugError,
  updateCatalogArtist,
} from "@/lib/services/artist.service";
import { artistFormSchema } from "@/lib/validators/admin/artist";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  const row = await getArtistRecordById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ record: artistRecordToFormInput(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
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
    const row = await updateCatalogArtist(id, parsed.data);
    return NextResponse.json({ slug: row?.slug });
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json({ error: new ArtistConflictError().message }, { status: 409 });
    }
    console.error("[admin/artists PATCH]", error);
    return NextResponse.json({ error: "Could not update artist." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    await deleteCatalogArtist(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/artists DELETE]", error);
    return NextResponse.json({ error: "Could not delete artist." }, { status: 500 });
  }
}
