import { NextResponse } from "next/server";
import { z } from "zod";
import { requireContentAdminApi } from "@/lib/admin-auth";
import { searchCatalogSources } from "@/lib/ai/content-import";

const bodySchema = z.object({ query: z.string().trim().min(2).max(120) });

/** POST /api/admin/ai/content/search — find a title on TMDB / AniList. */
export async function POST(request: Request) {
  const denied = await requireContentAdminApi();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  try {
    const candidates = await searchCatalogSources(parsed.data.query);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[admin ai search]", error);
    return NextResponse.json({ error: "Metadata search failed. Try again." }, { status: 502 });
  }
}
