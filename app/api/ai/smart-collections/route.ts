import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { getSmartCollectionIdeas } from "@/lib/services/smart-collections.service";

/** GET /api/ai/smart-collections — this week's AI collection ideas (built from behaviour). */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;
  return NextResponse.json({ ideas: await getSmartCollectionIdeas(auth.userId) });
}
