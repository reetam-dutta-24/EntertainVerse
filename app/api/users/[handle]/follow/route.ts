import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { isFollowForbidden, isFollowNotFound, toggleUserFollow } from "@/lib/services/follow.service";

interface RouteContext {
  params: Promise<{ handle: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { handle } = await context.params;

  try {
    const result = await toggleUserFollow(auth.userId, handle);
    return NextResponse.json(result);
  } catch (error) {
    if (isFollowNotFound(error)) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (isFollowForbidden(error)) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[user follow POST]", error);
    return NextResponse.json(
      { error: "Could not update follow status." },
      { status: 500 },
    );
  }
}
