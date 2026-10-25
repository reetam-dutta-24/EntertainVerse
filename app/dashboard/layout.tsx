import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ScreenTimeGate } from "@/components/screen-time/screen-time-gate";
import { requireCompletedOnboarding } from "@/lib/auth-guards";
import { isPlatformAdmin } from "@/lib/platform-roles";
import { getUserById } from "@/lib/services/user.service";
import { DEFAULT_AVATAR_COLOR } from "@/lib/brand-colors";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const userId = await requireCompletedOnboarding();
  const user = await getUserById(userId);

  const dashboardUser = {
    name: user?.name ?? "User",
    handle: user?.handle ?? "user",
    email: user?.email ?? "",
    avatarColor: user?.avatarColor ?? DEFAULT_AVATAR_COLOR,
    avatarUrl: user?.avatarUrl ?? undefined,
    isAdmin: user ? isPlatformAdmin(user.role) : false,
  };

  return (
    <ScreenTimeGate userId={userId}>
      <DashboardShell user={dashboardUser}>{children}</DashboardShell>
    </ScreenTimeGate>
  );
}
