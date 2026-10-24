import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  normalizeOnboardingSelection,
  type OnboardingGoalLink,
  type TasteBreakdownItem,
} from "@/lib/data/onboarding-config";
import { completeOnboarding } from "@/lib/services/onboarding.service";
import { applyOnboardingPicks } from "@/lib/services/onboarding-recommendations.service";

/**
 * POST /api/onboarding/complete
 * Called when the user finishes or skips onboarding.
 * Sets onboardingCompletedAt so future logins go straight to dashboard,
 * and turns favorite titles / artist picks into favorites and follows.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      tasteScore?: number;
      selection?: unknown;
      summaryChips?: string[];
      tasteBreakdown?: TasteBreakdownItem[];
      goalLinks?: OnboardingGoalLink[];
    };

    const tasteProfile =
      body.selection && body.tasteScore != null
        ? {
            tasteScore: body.tasteScore,
            selection: normalizeOnboardingSelection(body.selection),
            summaryChips: body.summaryChips ?? [],
            tasteBreakdown: body.tasteBreakdown ?? [],
            goalLinks: body.goalLinks ?? [],
          }
        : undefined;

    await completeOnboarding(session.user.id, body.tasteScore, tasteProfile);
    if (tasteProfile) {
      await applyOnboardingPicks(session.user.id, tasteProfile.selection);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[onboarding/complete]", error);
    return NextResponse.json(
      { error: "Could not save onboarding progress." },
      { status: 500 },
    );
  }
}
