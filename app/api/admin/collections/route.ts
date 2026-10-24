import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireSuperAdminApi, resolveAdminSession } from "@/lib/admin-auth";
import {
  AdminCollectionConflictError,
  createAdminCollection,
  isUniqueCollectionSlugError,
  listAdminCollections,
} from "@/lib/services/admin-collection.service";
import { adminCollectionFormSchema } from "@/lib/validators/admin/collection";

/** GET /api/admin/collections */
export async function GET(request: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const result = await listAdminCollections({
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 50),
  });
  return NextResponse.json(result);
}

/** POST /api/admin/collections */
export async function POST(request: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();

  const session = await resolveAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = adminCollectionFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await createAdminCollection(session.userId, parsed.data);
    return NextResponse.json(
      { recordId: row?.id, slug: row?.slug },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueCollectionSlugError(error)) {
      return NextResponse.json(
        { error: new AdminCollectionConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/collections POST]", error);
    return NextResponse.json({ error: "Could not create collection." }, { status: 500 });
  }
}
