import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { mapContentToItem } from "@/lib/mappers/content.mapper";
import {
  ContentConflictError,
  createCatalogContent,
  isUniqueSlugError,
  listCatalogContent,
} from "@/lib/services/content.service";
import {
  contentFormSchema,
  contentListQuerySchema,
} from "@/lib/validators/admin/content";
import { formatZodErrors } from "@/lib/validators/admin/format-zod-error";

/** GET /api/admin/content — paginated catalog list for admin UI. */
export async function GET(request: Request) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const parsed = contentListQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters." },
      { status: 400 },
    );
  }

  const result = await listCatalogContent({
    search: parsed.data.q,
    type: parsed.data.type,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });

  return NextResponse.json(result);
}

/** POST /api/admin/content — create a catalog item. */
export async function POST(request: Request) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  try {
    const body = await request.json();
    const parsed = contentFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const row = await createCatalogContent(parsed.data);
    return NextResponse.json(
      { item: mapContentToItem(row), recordId: row.id },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return NextResponse.json(
        { error: new ContentConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/content POST]", error);
    return NextResponse.json(
      { error: "Could not create content." },
      { status: 500 },
    );
  }
}
