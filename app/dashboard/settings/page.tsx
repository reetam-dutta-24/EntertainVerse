import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard";
import { SettingsView } from "@/components/settings";
import { getSettingsData } from "@/lib/data/settings";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = {
  title: "Settings — AniVerse",
  description:
    "Manage your AniVerse profile, notifications, privacy, and app preferences.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const data = await getSettingsData(user.id);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="settings" />
      <SettingsView data={data} />
    </div>
  );
}
