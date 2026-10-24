import { NextResponse } from "next/server";
import { z } from "zod";
import { requireArtistAdminApi } from "@/lib/admin-auth";
import { searchArtistSources } from "@/lib/ai/artist-import";

const bodySchema = z.object({ query: z.string().trim().min(2).max(120) });

/** POST /api/admin/ai/artists/search — find an artist on Deezer / MusicBrainz. */
export async function POST(request: Request) {
  const denied = await requireArtistAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  try {
    const candidates = await searchArtistSources(parsed.data.query);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[admin ai artist search]", error);
    return NextResponse.json({ error: "Artist search failed. Try again." }, { status: 502 });
  }
}
