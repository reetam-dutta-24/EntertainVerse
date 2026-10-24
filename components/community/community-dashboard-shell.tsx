"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUNITY_DASHBOARD_NAV_ICONS } from "@/lib/community-dashboard-nav";
import {
  getCommunityDashboardPath,
  type CommunityDashboardSection,
} from "@/lib/community-routes";
import { SearchPill } from "@/components/dashboard/search-pill";
import { CommunityDashboardMemberCard } from "@/components/community/community-dashboard-member-card";
import type { CommunityDashboardNavItem, Member } from "@/types";

export interface CommunityDashboardShellProps {
  communityId: string;
  communityName: string;
  navItems: CommunityDashboardNavItem[];
  onlineMembers: Member[];
  canManageMembers?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Full community dashboard layout — dark shell, cyan glass center, member sidebar. */
export function CommunityDashboardShell({
  communityId,
  communityName,
  navItems,
  onlineMembers,
  canManageMembers = false,
  children,
  className,
}: CommunityDashboardShellProps) {
  const pathname = usePathname();
  const [memberQuery, setMemberQuery] = useState("");

  const activeSection = pathname.split("/").pop() ?? "posts";

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return onlineMembers;
    return onlineMembers.filter((member) =>
      member.name.toLowerCase().includes(q),
    );
  }, [memberQuery, onlineMembers]);

  return (
    <div
      className={cn(
        "relative z-10 mx-auto w-full max-w-[1440px] px-4 pb-10 pt-5 sm:px-8 sm:pt-6 lg:px-12",
        className,
      )}
    >
      <h1 className="mb-5 text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:mb-6 sm:text-2xl">
        ✨🌏⛩️ {communityName}
      </h1>

      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-black/50 shadow-section-dim backdrop-blur-xl">
        <div className="grid min-h-[calc(100dvh-12rem)] grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
          <nav className="hidden flex-col gap-1 border-r border-white/[0.06] bg-sidebar/90 px-3 py-5 backdrop-blur-md lg:flex">
            {navItems.map((item) => {
              const Icon =
                COMMUNITY_DASHBOARD_NAV_ICONS[item.id] ?? LayoutList;
              const isActive = item.id === activeSection;
              const href = getCommunityDashboardPath(
                communityId,
                item.id as CommunityDashboardSection,
              );

              return (
                <Link
                  key={item.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/[0.07] text-white/95"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white/80",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative flex min-h-[560px] flex-col border-r border-cyan-400/18 bg-glass-cyan/15 backdrop-blur-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,220,210,0.18)_0%,rgba(0,180,200,0.08)_42%,transparent_72%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,200,190,0.11)]"
            />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              {children}
            </div>
          </div>

          <aside className="hidden flex-col border-white/[0.06] bg-sidebar/90 backdrop-blur-md lg:flex">
            <div className="shrink-0 border-b border-white/[0.06] px-3 py-3">
              <SearchPill
                placeholder="Search Member Name …"
                value={memberQuery}
                onChange={setMemberQuery}
                className="w-full max-w-none border-white/15 bg-black/30 focus-within:border-white/25"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="flex flex-col gap-2">
                {filteredMembers.map((member) => (
                  <CommunityDashboardMemberCard
                    key={member.id}
                    member={member}
                    communitySlug={communityId}
                    canManage={canManageMembers}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
