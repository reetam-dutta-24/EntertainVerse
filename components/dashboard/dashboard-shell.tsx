"use client";

import { useState } from "react";
import { DashboardBottomNav } from "@/components/dashboard/dashboard-bottom-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import type { DashboardUser } from "@/components/dashboard/user-profile-menu";
import { MatchInvitePopup } from "@/components/ai-mode/match-invite-popup";

export interface DashboardShellProps {
  user: DashboardUser;
  children: React.ReactNode;
}

/** Responsive dashboard chrome — drawer sidebar on mobile, fixed rail on desktop. */
export function DashboardShell({ user, children }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);

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

      <div className="lg:pl-[168px]">
        <DashboardTopbar
          user={user}
          onMenuClick={() => setNavOpen(true)}
        />
        <main className="overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-16">
          {children}
        </main>
      </div>

      <DashboardBottomNav />
    </div>
  );
}
