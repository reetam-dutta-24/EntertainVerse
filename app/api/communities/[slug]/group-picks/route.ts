import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getGroupPicks } from "@/lib/services/group-picks.service";

type RouteContext = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  mode: z.enum(["watch", "listen"]),
  /** Who to pick for (e.g. the people in the party); defaults to every member. */
  userIds: z.array(z.string().max(40)).max(12).optional(),
});

/** POST /api/communities/:slug/group-picks — "What should we watch / listen to?" for the group. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { slug } = await context.params;
  const members = await prisma.communityMember.findMany({ where: { community: { slug } }, select: { userId: true } });
  const memberIds = new Set(members.map((member) => member.userId));
  if (!memberIds.has(auth.userId)) return NextResponse.json({ error: "Only members can ask for group picks." }, { status: 403 });

  // Only real members of this room can be included.
  const userIds = (parsed.data.userIds?.length ? parsed.data.userIds : [...memberIds]).filter((id) => memberIds.has(id));
  if (!userIds.includes(auth.userId)) userIds.push(auth.userId);
  try {
    return NextResponse.json({ picks: await getGroupPicks(userIds.slice(0, 12), parsed.data.mode) });
  } catch (error) {
    console.error("[group picks]", error);
    return NextResponse.json({ error: "Couldn't work out group picks right now." }, { status: 500 });
  }
}
