import { scheduleEmbeddingSync } from "@/lib/recommender/embeddings";
import { NextResponse } from "next/server";
import { requireSuperAdminApi, resolveAdminSession } from "@/lib/admin-auth";
import {
  AdminCommunityConflictError,
  createAdminCommunity,
  isUniqueCommunitySlugError,
  listAdminCommunities,
} from "@/lib/services/admin-community.service";
import { adminCommunityFormSchema } from "@/lib/validators/admin/community";

/** GET /api/admin/communities */
export async function GET(request: Request) {
  const denied = await requireSuperAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const result = await listAdminCommunities({
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 50),
  });
  return NextResponse.json(result);
}

/** POST /api/admin/communities */
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
    const parsed = adminCommunityFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const row = await createAdminCommunity(session.userId, parsed.data);
    return NextResponse.json(
      { recordId: row?.id, slug: row?.slug },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueCommunitySlugError(error)) {
      return NextResponse.json(
        { error: new AdminCommunityConflictError().message },
        { status: 409 },
      );
    }
    console.error("[admin/communities POST]", error);
    return NextResponse.json({ error: "Could not create community." }, { status: 500 });
  }
}
