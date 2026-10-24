"use client";

import {
  Clock,
  Eye,
  FolderOpen,
  Headphones,
  Heart,
  Play,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { scrollToProfileSection } from "@/lib/profile-section-ids";
import type { ContentEngagementStat } from "@/types";

export interface ProfileHeroKpiGridProps {
  stats: ContentEngagementStat[];
}

const STAT_ICONS: Record<string, LucideIcon> = {
  friends: Users,
  artistsFollowing: Headphones,
  watchtime: Clock,
  songsPlayed: Play,
  collections: FolderOpen,
  favorites: Heart,
  communitiesJoined: Users,
  contentWatched: Eye,
};

function StatIcon({ stat }: { stat: ContentEngagementStat }) {
  const Icon = STAT_ICONS[stat.id] ?? Heart;
  return <Icon className="size-4 text-white sm:size-5" strokeWidth={2} />;
}

/** 2×5 KPI grid with smooth-scroll to profile sections. */
export function ProfileHeroKpiGrid({ stats }: ProfileHeroKpiGridProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 pt-1">
      <h2 className="text-sm font-bold text-white sm:text-base">📊 Stats</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        {stats.map((stat) => {
          if (stat.placeholder) {
            return (
              <div
                key={stat.id}
                aria-hidden
                className="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-2 py-2.5 text-center sm:min-h-[88px]"
              />
            );
          }

          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => {
                if (stat.scrollTarget) scrollToProfileSection(stat.scrollTarget);
              }}
              className="bg-gradient-brand flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center transition-transform hover:scale-[1.03] active:scale-[0.98] sm:min-h-[88px] sm:py-3"
            >
              <StatIcon stat={stat} />
              <span className="text-micro font-medium leading-tight text-white/95 sm:text-caption">
                {stat.label}
              </span>
              <span className="text-sm font-bold text-white sm:text-base">
                {stat.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
