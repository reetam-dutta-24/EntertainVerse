import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard";
import { AiProfileView } from "@/components/settings/ai-profile-view";
import { getCurrentUser } from "@/lib/data/user";
import { getAiProfile, getAiProfileInsights } from "@/lib/services/ai-profile.service";

export const metadata: Metadata = {
  title: "AI profile — EntertainVerse",
  description: "See, edit, download or wipe what EntertainVerse's recommender knows about your taste.",
};

export default async function AiProfilePage() {
  const user = await getCurrentUser();
  const [profile, insights] = await Promise.all([getAiProfile(user.id), getAiProfileInsights(user.id)]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="aiprofile" />
      <AiProfileView initialProfile={profile} insights={insights} />
    </div>
  );
}
