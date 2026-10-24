"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMUNITY_DASHBOARD_NAV_ICONS } from "@/lib/community-dashboard-nav";
import { getCommunityDashboardPath } from "@/lib/community-routes";
import { CreateCommunityPostButton } from "@/components/forms/create-community-post-button";
import { GradientButton } from "@/components/ui/gradient-button";
import { SearchPill } from "@/components/dashboard/search-pill";
import { CommunityDashboardFeedPost } from "@/components/community/community-dashboard-feed-post";
import { CommunityDashboardMemberCard } from "@/components/community/community-dashboard-member-card";
import type {
  CommunityDashboardNavItem,
  CommunityPost,
  Member,
} from "@/types";

export interface CommunityDashboardPreviewProps {
  communityId: string;
  navItems: CommunityDashboardNavItem[];
  posts: CommunityPost[];
  onlineMembers: Member[];
  onlineCount: number;
  postsToday: number;
  className?: string;
}

/** Bottom teaser overlay — soft blur fade to hint at full dashboard. */
function DashboardBottomTeaser({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] min-h-[180px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 via-cyan-950/8 to-transparent" />
      <div className="absolute inset-0 backdrop-blur-[10px] [mask-image:linear-gradient(to_top,black_0%,black_40%,transparent_100%)]" />
    </div>
  );
}

function postTeaserClass(index: number, total: number) {
  if (index === total - 1) {
    return "pointer-events-none scale-[0.98] opacity-25 blur-[6px]";
  }
  if (index === total - 2) {
    return "pointer-events-none opacity-50 blur-[2px]";
  }
  return "";
}

function memberTeaserClass(index: number, total: number) {
  if (index >= total - 2) {
    return "pointer-events-none opacity-30 blur-[4px]";
  }
  if (index === total - 3) {
    return "pointer-events-none opacity-55 blur-[1.5px]";
  }
  return "";
}

/** Figma community dashboard — labelled sidebar, feed stats, member search. */
export function CommunityDashboardPreview({
  communityId,
  navItems,
  posts,
  onlineMembers,
  onlineCount,
  postsToday,
  className,
}: CommunityDashboardPreviewProps) {
  const router = useAppRouter();
  const [activeNav, setActiveNav] = useState(navItems[0]?.id ?? "posts");
  const [memberQuery, setMemberQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return onlineMembers;
    return onlineMembers.filter((member) =>
      member.name.toLowerCase().includes(q),
    );
  }, [memberQuery, onlineMembers]);

  return (
    <section
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12",
        className,
      )}
    >
      <h2 className="mb-4 text-lg font-bold text-white/90 sm:mb-5 sm:text-heading">
        🏠 Community Dashboard
      </h2>

      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black/50 shadow-section-dim backdrop-blur-xl">
        <div className="relative grid min-h-[560px] grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
          <nav className="relative z-10 hidden flex-col gap-1 border-r border-white/[0.06] bg-sidebar/90 px-3 py-5 backdrop-blur-md lg:flex">
            {navItems.map((item) => {
              const Icon = COMMUNITY_DASHBOARD_NAV_ICONS[item.id] ?? LayoutList;
              const isActive = item.id === activeNav;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/[0.07] text-white/95"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white/80",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="relative z-10 flex min-h-[480px] flex-col border-r border-cyan-400/15 bg-glass-cyan/12 backdrop-blur-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,220,210,0.14)_0%,rgba(0,180,200,0.06)_42%,transparent_72%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,200,190,0.08)]"
            />

            <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-400/12 bg-black/25 px-4 py-3 backdrop-blur-sm sm:px-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-white/85">
                  <span
                    aria-hidden
                    className="size-2 rounded-full bg-emerald-500/75"
                  />
                  {onlineCount.toLocaleString()} Online
                </span>
                <span className="text-white/50 italic">
                  {postsToday} Posts Today
                </span>
              </div>
              <CreateCommunityPostButton communitySlug={communityId} />
            </div>

            <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full max-h-[520px] flex-col gap-4 overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
                {posts.map((post, index) => (
                  <CommunityDashboardFeedPost
                    key={post.id}
                    post={post}
                    communitySlug={communityId}
                    className={postTeaserClass(index, posts.length)}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="relative z-10 hidden flex-col border-white/[0.06] bg-sidebar/90 backdrop-blur-md lg:flex">
            <div className="shrink-0 border-b border-white/[0.06] px-3 py-3">
              <SearchPill
                placeholder="Search Member Name …"
                value={memberQuery}
                onChange={setMemberQuery}
                className="w-full max-w-none border-white/15 bg-black/30 focus-within:border-white/25"
              />
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div className="flex max-h-[520px] flex-col gap-2 overflow-hidden px-3 py-3">
                {filteredMembers.map((member, index) => (
                  <CommunityDashboardMemberCard
                    key={member.id}
                    member={member}
                    className={memberTeaserClass(index, filteredMembers.length)}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>

        <DashboardBottomTeaser className="z-30" />
      </div>

      <div className="mt-5 flex justify-center sm:mt-6">
        <GradientButton
          size="md"
          className="w-full max-w-md rounded-full px-8 sm:w-auto"
          onClick={() => router.push(getCommunityDashboardPath(communityId))}
        >
          View Full Community Dashboard
        </GradientButton>
      </div>
    </section>
  );
}
