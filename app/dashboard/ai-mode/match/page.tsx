import type { Metadata } from "next";
import { MatchExperience } from "@/components/ai-mode/match-experience";
import { getCurrentUser } from "@/lib/data/user";
import { getMatchProfile, listMyCircles } from "@/lib/services/match.service";

export const metadata: Metadata = {
  title: "AI Match — AniVerse",
  description: "Get matched into small circles of people who share your taste and personality — nearby or worldwide.",
};

export default async function AiMatchPage() {
  const user = await getCurrentUser();
  const [profile, circles] = await Promise.all([getMatchProfile(user.id), listMyCircles(user.id)]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <MatchExperience initialProfile={profile} initialCircles={circles} />
    </div>
  );
}
