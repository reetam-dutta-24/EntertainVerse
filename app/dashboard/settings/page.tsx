import type { Metadata } from "next";
import { WelcomeBanner } from "@/components/dashboard";
import { SettingsView } from "@/components/settings";
import { DailyLimitSettings } from "@/components/screen-time/daily-limit-settings";
import { getScreenTimeStatus } from "@/lib/services/screen-time.service";
import { getSettingsData } from "@/lib/data/settings";
import { getCurrentUser } from "@/lib/data/user";

export const metadata: Metadata = {
  title: "Settings — EntertainVerse",
  description:
    "Manage your EntertainVerse profile, notifications, privacy, and app preferences.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const [data, screenTime] = await Promise.all([getSettingsData(user.id), getScreenTimeStatus(user.id)]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 sm:gap-6">
      <WelcomeBanner userName={user.name} variant="settings" />
      <DailyLimitSettings initialStatus={screenTime} />
      <SettingsView data={data} />
    </div>
  );
}
