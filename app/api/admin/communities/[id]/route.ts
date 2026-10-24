import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/admin-auth";
import {
  AdminCommunityConflictError,
  adminCommunityToFormInput,
  deleteAdminCommunity,
  getAdminCommunityById,
  isUniqueCommunitySlugError,
  updateAdminCommunity,
} from "@/lib/services/admin-community.service";
import { adminCommunityFormSchema } from "@/lib/validators/admin/community";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  const { id } = await context.params;
  const row = await getAdminCommunityById(id);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ record: adminCommunityToFormInput(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    const body = await request.json();
    const parsed = adminCommunityFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await updateAdminCommunity(id, parsed.data);
    return NextResponse.json({ slug: row?.slug });
  } catch (error) {
    if (isUniqueCommunitySlugError(error)) {
      return NextResponse.json(
        { error: new AdminCommunityConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/communities PATCH]", error);
    return NextResponse.json({ error: "Could not update community." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;
  // Keep recommender embeddings in step with the catalog (runs after the response).
  scheduleEmbeddingSync();
  const { id } = await context.params;
  try {
    await deleteAdminCommunity(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/communities DELETE]", error);
    return NextResponse.json({ error: "Could not delete community." }, { status: 500 });
  }
}
