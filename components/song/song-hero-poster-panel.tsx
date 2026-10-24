"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, PlayCircle, Plus, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrackPreviewUrl } from "@/lib/music-preview";
import { getPlayAccentTheme, getPlayFairyInnerGlow } from "@/lib/play-ambient";
import {
  detailHeroBtnBase,
  DETAIL_HERO_BTN_GROUP,
} from "@/lib/detail-route-ui";
import { AddToCollectionDialog } from "@/components/forms/add-to-collection-dialog";
import { ToggleSongFavoriteButton } from "@/components/forms/toggle-song-favorite-button";
import { SongLyricsPanel } from "@/components/song/song-lyrics-panel";
import type { AccentColor } from "@/types";
import { PreviewBadge } from "@/components/ui/coming-soon-notice";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export interface SongHeroPosterPanelProps {
  songSlug: string;
  title: string;
  artist: string;
  initialFavorited?: boolean;
  resumeLabel?: string;
  durationSeconds?: number;
  audioUrl?: string;
  lyrics?: string;
  accent?: AccentColor;
}

/** Right hero panel — inline playback, synced lyrics, accent glow, volume. */
export function SongHeroPosterPanel({
  songSlug,
  title,
  artist,
  resumeLabel,
  durationSeconds,
  initialFavorited,
  audioUrl,
  lyrics,
  accent,
}: SongHeroPosterPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);

  const theme = useMemo(() => getPlayAccentTheme(accent), [accent]);
  const fairyGlow = useMemo(() => getPlayFairyInnerGlow(accent), [accent]);
  const previewUrl = getTrackPreviewUrl(songSlug, audioUrl);
  const playLabel = resumeLabel ? `Continue from ${resumeLabel}` : "Play Now";
  const progressMax = duration || durationSeconds || 1;
  const effectiveVolume = muted ? 0 : volume;

  const syncDuration = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    } else if (durationSeconds) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      setProgress(audio!.currentTime);
    }
    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    function onEnded() {
      setIsPlaying(false);
      setProgress(0);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [syncDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = effectiveVolume;
  }, [effectiveVolume]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress(value);
  }

  return (
    <>
      <audio ref={audioRef} src={previewUrl} preload="metadata" className="hidden" />

      <div id="player" className="absolute inset-0">

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] transition-opacity duration-700",
          isPlaying ? "opacity-100" : "opacity-0",
        )}
        style={{
          boxShadow: isPlaying ? theme.fairyInnerShadow : undefined,
        }}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] transition-opacity duration-700",
          isPlaying ? "opacity-100 animate-pulse" : "opacity-0",
        )}
        style={{
          background: isPlaying
            ? `${fairyGlow.radialWash}, ${fairyGlow.edgeSparkle}`
            : undefined,
          animationDuration: "4s",
        }}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[3] transition-opacity duration-500",
          isPlaying ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: `linear-gradient(to top, rgba(${theme.rgb[0]},${theme.rgb[1]},${theme.rgb[2]},0.38) 0%, rgba(${theme.rgb[0]},${theme.rgb[1]},${theme.rgb[2]},0.12) 40%, transparent 78%)`,
        }}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-4 pt-8 sm:gap-3 sm:px-5 sm:pb-5 sm:pt-12",
          isPlaying && "pt-16 sm:pt-20",
        )}
      >
        {isPlaying ? (
          <>
            <SongLyricsPanel
              lyrics={lyrics}
              progress={progress}
              duration={progressMax}
              theme={theme}
              variant="overlay"
              maxLines={5}
            />

            <div
              className="space-y-2 rounded-xl border bg-black/50 px-3 py-2.5 backdrop-blur-sm"
              style={{ borderColor: theme.border, boxShadow: theme.glow }}
            >
              <div className="flex items-center justify-between gap-2 text-caption text-white/60">
                <span className="truncate font-medium text-white/90">{title}</span>
                <span className="shrink-0">{artist}</span>
              </div>
              <input
                type="range"
                min={0}
                max={progressMax}
                step={0.1}
                value={progress}
                onChange={(event) => handleSeek(Number(event.target.value))}
                className="h-1 w-full cursor-pointer"
                style={{ accentColor: theme.slider }}
                aria-label="Playback progress"
              />
              <div className="flex justify-between text-caption text-white/50">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(progressMax)}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setMuted((current) => !current)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="cursor-pointer rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="size-3.5" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={effectiveVolume}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setVolume(next);
                    setMuted(next === 0);
                  }}
                  className="h-1 flex-1 cursor-pointer"
                  style={{ accentColor: theme.slider }}
                  aria-label="Volume"
                />
              </div>
            </div>
          </>
        ) : null}

        <div className={DETAIL_HERO_BTN_GROUP}>
          <ToggleSongFavoriteButton
            songSlug={songSlug}
            initialFavorited={initialFavorited}
          />
          <button
            type="button"
            onClick={() => setCollectionOpen(true)}
            className={detailHeroBtnBase(
              "border-transparent bg-gradient-to-r from-blue-600 to-violet-600 text-white",
            )}
          >
            <Plus className="size-3.5 shrink-0" />
            <span className="truncate">Add To Collection</span>
          </button>
        </div>

        <div className={DETAIL_HERO_BTN_GROUP}>
          <button
            type="button"
            onClick={() => void togglePlayback()}
            className={detailHeroBtnBase("border-transparent text-white transition hover:scale-[1.02] hover:opacity-95")}
            style={{ background: theme.gradient, boxShadow: theme.glow }}
            aria-pressed={isPlaying}
          >
            {isPlaying ? (
              <Pause className="size-4 shrink-0 fill-current" />
            ) : (
              <PlayCircle className="size-4 shrink-0" />
            )}
            <span className="truncate">{isPlaying ? "Pause" : playLabel}</span>
          </button>
          {!audioUrl?.trim() ? <PreviewBadge /> : null}
        </div>
      </div>

      <AddToCollectionDialog
        itemKind="song"
        itemSlug={songSlug}
        itemTitle={title}
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
      />
    </div>
    </>
  );
}
