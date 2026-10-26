import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import {
  CommunityForbiddenError,
  CommunityNotFoundError,
  joinCommunity,
  leaveCommunity,
} from "@/lib/services/community.service";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { slug } = await context.params;

  try {
    const result = await joinCommunity(auth.userId, slug);
    return NextResponse.json(
      { ok: true, slug: result.slug, joined: result.joined },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CommunityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CommunityForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[community join POST]", error);
    return NextResponse.json({ error: "Could not join community." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { slug } = await context.params;

  try {
    await leaveCommunity(auth.userId, slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CommunityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CommunityForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[community join DELETE]", error);
    return NextResponse.json({ error: "Could not leave community." }, { status: 500 });
  }
}
