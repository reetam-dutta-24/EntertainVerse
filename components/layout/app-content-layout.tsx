import { ContentTopbar } from "@/components/content/content-topbar";
import { ScreenTimeGate } from "@/components/screen-time/screen-time-gate";
import { MatchInvitePopup } from "@/components/ai-mode/match-invite-popup";
import { AssistantRoot } from "@/components/assistant/assistant-root";
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
        {/* Room invites pop up on every signed-in page. */}
        {session?.user?.id ? <MatchInvitePopup /> : null}
        <ContentTopbar user={user} />
        <main className={mainClassName}>{children}</main>
        {user ? <AssistantRoot userKey={user.handle} userName={user.name} /> : null}
      </div>
    </ScreenTimeGate>
  );
}
