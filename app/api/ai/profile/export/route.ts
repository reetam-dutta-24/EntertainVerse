import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import { exportAiProfile } from "@/lib/services/ai-profile.service";

/** GET /api/ai/profile/export — download everything the recommender uses about you (JSON). */
export async function GET() {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const data = await exportAiProfile(auth.userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="entertainverse-ai-profile-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
