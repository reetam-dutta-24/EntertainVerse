import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeOnboardingSelection } from "@/lib/data/onboarding-config";
import { buildOnboardingRecommendations } from "@/lib/services/onboarding-recommendations.service";

/** POST /api/onboarding/recommendations — build taste profile picks on the server. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const selection = normalizeOnboardingSelection(body.selection ?? body);
    const recommendations = await buildOnboardingRecommendations(
      selection,
      session.user.id,
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[onboarding/recommendations]", error);
    return NextResponse.json(
      { error: "Could not build recommendations." },
      { status: 500 },
    );
  }
}
