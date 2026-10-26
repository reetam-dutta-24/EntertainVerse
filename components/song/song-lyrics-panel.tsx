"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getLyricWindow, parseLyricsText } from "@/lib/lyrics-display";
import type { PlayAccentTheme } from "@/lib/play-ambient";

export interface SongLyricsPanelProps {
  lyrics?: string;
  progress: number;
  duration: number;
  theme: PlayAccentTheme;
  /** Compact overlay for hero poster playback. */
  variant?: "panel" | "overlay";
  maxLines?: number;
  className?: string;
}

/** Spotify-style lyric window — highlights the line being sung. */
export function SongLyricsPanel({
  lyrics,
  progress,
  duration,
  theme,
  variant = "panel",
  maxLines = 4,
  className,
}: SongLyricsPanelProps) {
  const lines = useMemo(() => parseLyricsText(lyrics), [lyrics]);
  const window = useMemo(
    () => getLyricWindow(lines, progress, duration, maxLines),
    [lines, progress, duration, maxLines],
  );

  if (!lines.length) {
    return (
      <div
        className={cn(
          variant === "overlay"
            ? "rounded-xl border border-white/10 bg-black/45 px-3 py-4 text-center backdrop-blur-sm"
            : "mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center",
          className,
        )}
      >
        <p className="text-xs text-white/60">No lyrics available for this track.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:px-4 sm:py-4",
        variant === "overlay" && "bg-black/50 backdrop-blur-md",
        className,
      )}
      style={{
        borderColor: theme.border,
        backgroundColor: variant === "panel" ? theme.panelBg : undefined,
        boxShadow: variant === "overlay" ? theme.glow : undefined,
      }}
    >
      <p className="text-micro font-semibold uppercase tracking-widest text-white/60">
        Lyrics
      </p>
      <div
        className={cn(
          "flex flex-col justify-center gap-1.5 sm:gap-2",
          variant === "overlay" ? "min-h-[5.5rem]" : "min-h-[7rem]",
        )}
      >
        {window.map((line, index) => (
          <p
            key={`${line.text}-${index}`}
            className={cn(
              "leading-relaxed transition-all duration-300",
              variant === "overlay" ? "text-xs sm:text-sm" : "text-sm",
              line.active
                ? "scale-[1.03] font-semibold"
                : line.past
                  ? "text-white/35"
                  : "text-white/55",
            )}
            style={line.active ? { color: theme.textAccent } : undefined}
          >
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}
