import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMusicAdminApi } from "@/lib/admin-auth";
import { searchMusicSources } from "@/lib/ai/music-import";

const bodySchema = z.object({ query: z.string().trim().min(2).max(120) });

/** POST /api/admin/ai/music/search — find a song on Apple Music / Deezer. */
export async function POST(request: Request) {
  const denied = await requireMusicAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  try {
    const candidates = await searchMusicSources(parsed.data.query);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[admin ai music search]", error);
    return NextResponse.json({ error: "Music search failed. Try again." }, { status: 502 });
  }
}
