"use client";

import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";
import {
  UserProfileMenu,
  type DashboardUser,
} from "@/components/dashboard/user-profile-menu";

const titles: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/discover": "Discover",
  "/dashboard/collections": "Collections",
  "/dashboard/watchlist": "Watchlist",
  "/dashboard/for-you": "For You",
  "/dashboard/analytics": "Analytics",
  "/dashboard/notifications": "Notifications",
  "/dashboard/community": "Community",
  "/dashboard/settings": "Settings",
  "/search": "Search",
};

export interface DashboardTopbarProps {
  user: DashboardUser;
  onMenuClick?: () => void;
  initialSearchQuery?: string;
}

/** Sticky header — stacks on mobile, full row on desktop. */
export function DashboardTopbar({
  user,
  onMenuClick,
  initialSearchQuery,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const title =
    titles[pathname] ??
    titles[
      Object.keys(titles)
        .filter((key) => key !== "/dashboard" && pathname.startsWith(key))
        .sort((a, b) => b.length - a.length)[0] ?? "/dashboard"
    ];

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
      <div className="flex h-14 flex-col sm:h-[72px]">
        <div className="flex h-14 items-center gap-3 px-4 sm:h-[72px] sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            className="cursor-pointer rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <h1 className="text-gradient-brand min-w-0 shrink-0 text-xl font-bold sm:text-heading">
            {title}
          </h1>

          <div className="ms-auto flex items-center gap-3 sm:gap-4">
            <div className="hidden md:block md:w-[280px] lg:w-[340px]">
              <Suspense fallback={<div className="h-10 rounded-full border border-white/25 bg-surface/60" />}>
                <GlobalSearch initialQuery={initialSearchQuery} />
              </Suspense>
            </div>

            <button
              type="button"
              aria-label={mobileSearchOpen ? "Close search" : "Open search"}
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="cursor-pointer rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 md:hidden"
            >
              {mobileSearchOpen ? (
                <X className="size-5" />
              ) : (
                <Search className="size-5" />
              )}
            </button>

            <NotificationBell />

            <UserProfileMenu user={user} placement="topbar" />
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="border-t border-white/8 px-4 pb-3 pt-2 md:hidden">
            <Suspense fallback={<div className="h-10 rounded-full border border-white/25 bg-surface/60" />}>
              <GlobalSearch initialQuery={initialSearchQuery} autoFocus />
            </Suspense>
          </div>
        ) : null}
      </div>
    </header>
  );
}
