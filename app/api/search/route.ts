import { NextResponse } from "next/server";
import { searchAutocomplete } from "@/lib/data/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Number(searchParams.get("limit") ?? "8");

  const results = await searchAutocomplete(q, Number.isFinite(limit) ? limit : 8);
  // Public catalog results (no per-user data): the browser may reuse them briefly.
  return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } });
}
