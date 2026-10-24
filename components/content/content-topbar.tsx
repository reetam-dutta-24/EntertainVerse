"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  UserProfileMenu,
  type DashboardUser,
} from "@/components/dashboard/user-profile-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";

export interface ContentTopbarProps {
  user?: DashboardUser | null;
  initialSearchQuery?: string;
}

/** Content detail top bar — logo, global search, notifications, user menu. */
export function ContentTopbar({
  user,
  initialSearchQuery,
}: ContentTopbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-4 sm:h-[72px] sm:gap-6 sm:px-8 lg:px-12">
        <Link href="/dashboard" className="shrink-0 p-1 sm:p-2">
          <span className="text-gradient-brand text-xl font-semibold leading-none sm:text-heading">
            AniVerse
          </span>
        </Link>

        <Suspense
          fallback={
            <div className="mx-auto h-10 w-full max-w-[340px] rounded-full border border-white/25 bg-surface/60 sm:max-w-[400px]" />
          }
        >
          <GlobalSearch
            className="mx-auto max-w-[340px] sm:max-w-[400px]"
            initialQuery={initialSearchQuery}
          />
        </Suspense>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <NotificationBell />
          {user ? (
            <UserProfileMenu user={user} placement="topbar" />
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
