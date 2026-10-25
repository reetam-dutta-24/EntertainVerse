"use client";

import { useState } from "react";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import type { DashboardUser } from "@/components/dashboard/user-profile-menu";
import { MatchInvitePopup } from "@/components/ai-mode/match-invite-popup";
import { AssistantProvider, useAssistant } from "@/components/assistant/assistant-context";
import { AssistantLauncher, AssistantPanel } from "@/components/assistant/assistant-panel";
import { cn } from "@/lib/utils";

export interface DashboardShellProps {
  user: DashboardUser;
  children: React.ReactNode;
}

/**
 * Responsive dashboard chrome — drawer sidebar on mobile, fixed rail on desktop, and the
 * AniVerse Assistant on the right (docked from xl, overlay on laptops, a sheet on phones).
 */
export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <AssistantProvider userKey={user.handle} userName={user.name}>
      <ShellLayout user={user}>{children}</ShellLayout>
    </AssistantProvider>
  );
}

function ShellLayout({ user, children }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const { open: assistantOpen } = useAssistant();

  return (
    <div className="min-h-dvh bg-background">
      <MatchInvitePopup />
      <DashboardSidebar
        user={user}
        mobileOpen={navOpen}
        onNavigate={() => setNavOpen(false)}
      />

      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      {/* The page makes room for the docked assistant on wide screens. */}
      <div className={cn("transition-[padding] duration-300 lg:pl-[168px]", assistantOpen && "xl:pr-[400px]")}>
        <DashboardTopbar
          user={user}
          onMenuClick={() => setNavOpen(true)}
        />
        <main className="overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>

      <DashboardBottomNav />
      <AssistantLauncher />
      <AssistantPanel />
    </div>
  );
}
