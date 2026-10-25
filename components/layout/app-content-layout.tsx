import { ContentTopbar } from "@/components/content/content-topbar";
import { ScreenTimeGate } from "@/components/screen-time/screen-time-gate";
import { auth } from "@/lib/auth";
import { getOptionalTopbarUser } from "@/lib/data/user";

export interface AppContentLayoutProps {
  children: React.ReactNode;
  /** Extra classes on `<main>` (e.g. search page padding). */
  mainClassName?: string;
}

/** Shared shell for all public content routes — consistent topbar + main. */
export async function AppContentLayout({
  children,
  mainClassName = "w-full pb-16",
}: AppContentLayoutProps) {
  const [user, session] = await Promise.all([getOptionalTopbarUser(), auth()]);

  return (
    <ScreenTimeGate userId={session?.user?.id}>
      <div className="min-h-dvh bg-background">
        <ContentTopbar user={user} />
        <main className={mainClassName}>{children}</main>
      </div>
    </ScreenTimeGate>
  );
}
