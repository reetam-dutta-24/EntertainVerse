import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeOnboardingSelection } from "@/lib/data/onboarding-config";
import { getTasteProfileForUser } from "@/lib/services/onboarding.service";

/** GET /api/onboarding/profile — saved taste-test answers for the current user. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getTasteProfileForUser(session.user.id);
  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      selection: normalizeOnboardingSelection(profile.selections),
      recommendations: {
        tasteScore: profile.tasteScore,
        tasteBreakdown: profile.tasteBreakdown,
        summaryChips: profile.summaryChips,
        goalLinks: profile.goalLinks,
      },
      completedAt: profile.completedAt.toISOString(),
    },
  });
}
