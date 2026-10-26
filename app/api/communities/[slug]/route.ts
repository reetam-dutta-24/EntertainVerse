import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireUserApi } from "@/lib/api-auth";
import { mapCommunityToCard } from "@/lib/mappers/community.mapper";
import {
  CommunityForbiddenError,
  CommunityNotFoundError,
  deleteCommunity,
  getCommunityDetailBySlug,
  updateCommunity,
} from "@/lib/services/community.service";
import { communityUpdateSchema } from "@/lib/validators/community";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const session = await auth();
  const detail = await getCommunityDetailBySlug(slug, session?.user?.id);
  if (!detail) {
    return NextResponse.json({ error: "Community not found." }, { status: 404 });
  }
  return NextResponse.json({ community: detail });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireUserApi();
  if (authResult.error) return authResult.error;

  const { slug } = await context.params;

  try {
    const body = await request.json();
    const parsed = communityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const result = await updateCommunity(authResult.userId, slug, parsed.data);
    return NextResponse.json({
      community: mapCommunityToCard(result.row),
      joinCode: result.joinCode,
    });
  } catch (error) {
    if (error instanceof CommunityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CommunityForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[communities PATCH]", error);
    return NextResponse.json(
      { error: "Could not update community." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireUserApi();
  if (authResult.error) return authResult.error;

  const { slug } = await context.params;

  try {
    await deleteCommunity(authResult.userId, slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[communities DELETE]", error);
    return NextResponse.json(
      { error: "Could not delete community." },
      { status: 500 },
    );
  }
}
