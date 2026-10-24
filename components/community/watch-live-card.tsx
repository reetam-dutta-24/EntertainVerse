import { Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccentStyle } from "@/lib/accents";
import type { WatchParty } from "@/types";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export interface WatchLiveCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  party: WatchParty;
  onJoin?: () => void;
}

/** Wide watch-room banner (Figma "Watch live Component", 982×348). */
export function WatchLiveCard({
  party,
  onJoin,
  className,
  ...props
}: WatchLiveCardProps) {
  const accent = getAccentStyle(party.accent ?? "purple");

  return (
    <div
      className={cn(
        "flex w-full max-w-[982px] flex-col overflow-hidden rounded-card bg-glass-purple transition-shadow duration-300 sm:h-[348px] sm:flex-row",
        accent.hoverGlow,
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative h-[160px] w-full shrink-0 sm:h-full sm:w-[45%]",
          accent.header,
        )}
      >
        {party.live ? (
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-brand-magenta px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <Radio className="size-3.5" />
            Live
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 bg-surface p-8 shadow-panel">
        <h3 className="text-heading font-bold text-white">{party.title}</h3>
        {party.nowPlaying ? (
          <p className="text-sm text-muted">{party.nowPlaying}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {party.viewerCount != null ? (
            <Chip variant="brand" className="gap-1.5">
              <Users className="size-3.5" />
              {party.viewerCount.toLocaleString()} watching
            </Chip>
          ) : null}
          {party.participants?.length ? (
            <AvatarStack users={party.participants} size="sm" />
          ) : null}
        </div>
        <div className="mt-2">
          <Button variant="gradient" size="md" onClick={onJoin}>
            {party.live ? "Join Room" : "Set Reminder"}
          </Button>
        </div>
      </div>
    </div>
  );
}
