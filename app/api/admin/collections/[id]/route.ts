import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin-auth";
import {
  AdminCollectionConflictError,
  adminCollectionToFormInput,
  deleteAdminCollection,
  getAdminCollectionById,
  isUniqueCollectionSlugError,
  updateAdminCollection,
} from "@/lib/services/admin-collection.service";
import { adminCollectionFormSchema } from "@/lib/validators/admin/collection";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  const row = await getAdminCollectionById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ record: adminCollectionToFormInput(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = adminCollectionFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await updateAdminCollection(id, parsed.data);
    return NextResponse.json({ slug: row?.slug });
  } catch (error) {
    if (isUniqueCollectionSlugError(error)) {
      return NextResponse.json(
        { error: new AdminCollectionConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/collections PATCH]", error);
    return NextResponse.json({ error: "Could not update collection." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    await deleteAdminCollection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/collections DELETE]", error);
    return NextResponse.json({ error: "Could not delete collection." }, { status: 500 });
  }
}
