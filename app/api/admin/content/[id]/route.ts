import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import {
  ContentConflictError,
  deleteCatalogContent,
  contentRecordToFormInput,
  getContentRecordById,
  isUniqueSlugError,
  updateCatalogContent,
} from "@/lib/services/content.service";
import { contentFormSchema } from "@/lib/validators/admin/content";
import { formatZodErrors } from "@/lib/validators/admin/format-zod-error";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/content/[id] */
export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;

  const { id } = await context.params;
  const row = await getContentRecordById(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    item: mapContentToItem(row),
    record: contentRecordToFormInput(row),
  });
}

/** PATCH /api/admin/content/[id] */
export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = contentFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const row = await updateCatalogContent(id, parsed.data);
    return NextResponse.json({ item: mapContentToItem(row) });
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json(
        { error: new ContentConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/content PATCH]", error);
    return NextResponse.json(
      { error: "Could not update content." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/content/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  const { id } = await context.params;

  try {
    await deleteCatalogContent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/content DELETE]", error);
    return NextResponse.json(
      { error: "Could not delete content." },
      { status: 500 },
    );
  }
}
