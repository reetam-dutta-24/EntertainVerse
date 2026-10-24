import {
  Clock,
  Eye,
  FolderOpen,
  Headphones,
  Heart,
  ListMusic,
  MessageSquare,
  Play,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContentEngagementStat } from "@/types";

export interface ArtistKpiSectionProps {
  stats: ContentEngagementStat[];
}

const STAT_ICONS: Record<string, LucideIcon> = {
  posts: MessageSquare,
  members: Users,
  friends: Users,
  artistsFollowing: Headphones,
  songsPlayed: Play,
  rank: Trophy,
  likes: Heart,
  followers: Users,
  following: UserPlus,
  views: Eye,
  collections: FolderOpen,
  watchtime: Clock,
  listeners: Headphones,
  playlist: ListMusic,
  plays: Play,
  watchlist: ListMusic,
  reviews: MessageSquare,
  favorites: Heart,
};

function StatIcon({ stat }: { stat: ContentEngagementStat }) {
  const Icon = STAT_ICONS[stat.id] ?? Heart;
  return <Icon className="size-5 text-white" strokeWidth={2} />;
}

/** Artist KPI strip — full-width black band directly below the hero. */
export function ArtistKpiSection({ stats }: ArtistKpiSectionProps) {
  return (
    <section className="w-full bg-black">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-stretch justify-between gap-6 sm:gap-8 lg:gap-10">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-gradient-brand flex w-[128px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center sm:w-[148px] sm:py-3 lg:w-[160px]"
            >
              <StatIcon stat={stat} />
              <span className="text-caption font-medium leading-tight text-white/95 sm:text-caption">
                {stat.label}
              </span>
              <span className="text-sm font-bold text-white sm:text-base lg:text-lg">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
