"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import Link from "next/link";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEpisodeDisplayTitle } from "@/lib/format-episode-title";
import { formatRating } from "@/lib/format-rating";
import { Chip } from "@/components/ui/chip";
import { getContentDetailPath, getContentWatchPath } from "@/lib/content-routes";
import { resolvePlayableVideoUrl } from "@/lib/services/content-play.service";
import { getPlayAccentTheme, getPlayFairyInnerGlow } from "@/lib/play-ambient";
import { isMovieContentType } from "@/lib/content-media";
import { HdImage } from "@/components/ui/hd-image";
import { PlayAmbientBackground } from "@/components/collection/play-ambient-background";
import type { ContentPlaySession, Episode } from "@/types";

interface ContentPlayViewProps {
  session: ContentPlaySession;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function episodeHasDetails(episode: Episode, isMovie: boolean) {
  return Boolean(
    episode.description?.trim() ||
      episode.rating != null ||
      episode.language ||
      episode.releaseDate ||
      episode.duration ||
      (!isMovie && episode.number),
  );
}

export function ContentPlayView({ session }: ContentPlayViewProps) {
  const router = useAppRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState(session.currentEpisodeId);
  useOnValueChange(session.currentEpisodeId, (next) => setActiveEpisodeId(next));
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsVisible = showControls || !isPlaying;

  const theme = useMemo(() => getPlayAccentTheme(session.accent), [session.accent]);
  const fairyGlow = useMemo(() => getPlayFairyInnerGlow(session.accent), [session.accent]);
  const isMovie = isMovieContentType(session.contentType);
  const activeEpisode = useMemo(
    () =>
      session.episodes.find((episode) => episode.id === activeEpisodeId) ??
      session.episodes[0],
    [session.episodes, activeEpisodeId],
  );
  const videoUrl = resolvePlayableVideoUrl(session, activeEpisodeId);
  const displayTitle = activeEpisode
    ? formatEpisodeDisplayTitle(activeEpisode.title, activeEpisode.number)
    : session.contentTitle;

  const episodeIndex = session.episodes.findIndex(
    (episode) => episode.id === activeEpisodeId,
  );
  const hasPrevious = episodeIndex > 0;
  const hasNext =
    episodeIndex >= 0 && episodeIndex < session.episodes.length - 1;

  const syncDuration = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate() {
      setProgress(video!.currentTime);
    }
    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    function onEnded() {
      setIsPlaying(false);
      if (hasNext) {
        const nextEpisode = session.episodes[episodeIndex + 1];
        if (nextEpisode) {
          router.push(getContentWatchPath(session.contentSlug, nextEpisode.id));
        }
      }
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [
    episodeIndex,
    hasNext,
    router,
    session.contentSlug,
    session.episodes,
    syncDuration,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
  }, [activeEpisodeId, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = muted ? 0 : volume;
  }, [muted, volume]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => setShowControls(false), 2800);
    return () => window.clearTimeout(timer);
  }, [isPlaying, progress]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (isPlaying) {
      video.pause();
      return;
    }
    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  }

  function handleSeek(value: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setProgress(value);
  }

  function goToEpisode(episodeId: string) {
    if (episodeId === activeEpisodeId) return;
    router.push(getContentWatchPath(session.contentSlug, episodeId));
    setActiveEpisodeId(episodeId);
  }

  function goPrevious() {
    if (!hasPrevious) return;
    const previous = session.episodes[episodeIndex - 1];
    if (previous) goToEpisode(previous.id);
  }

  function goNext() {
    if (!hasNext) return;
    const next = session.episodes[episodeIndex + 1];
    if (next) goToEpisode(next.id);
  }

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await container.requestFullscreen();
  }

  const progressMax = duration > 0 ? duration : 1;

  const showEpisodeDetails =
    activeEpisode != null && episodeHasDetails(activeEpisode, isMovie);

  return (
    <>
      <PlayAmbientBackground accent={session.accent} />

      <div
        className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 lg:min-h-[calc(100dvh-4.5rem)] lg:flex-row lg:items-stretch lg:px-12"
        style={
          {
            "--play-accent": theme.primary,
            "--play-accent-muted": theme.primaryMuted,
          } as React.CSSProperties
        }
      >
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={getContentDetailPath(session.contentSlug)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-[var(--play-accent)]"
          >
            <ArrowLeft className="size-4" />
            Back to {session.contentTitle}
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white sm:text-2xl">{displayTitle}</h1>
          {!isMovie && activeEpisode ? (
            <p className="text-sm text-white/60">
              S{activeEpisode.seasonNumber ?? 1} · E{activeEpisode.number}
              {activeEpisode.duration ? ` · ${activeEpisode.duration}` : ""}
            </p>
          ) : isMovie && activeEpisode?.duration ? (
            <p className="text-sm text-white/60">{activeEpisode.duration}</p>
          ) : null}
        </div>

        <div className="relative">
          {videoUrl && isPlaying ? (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-3 z-0 rounded-card opacity-100 transition-opacity duration-700"
                style={{
                  boxShadow: theme.fairyInnerShadow,
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-2 z-0 animate-pulse rounded-card opacity-100 transition-opacity duration-700"
                style={{
                  background: `${fairyGlow.radialWash}, ${fairyGlow.edgeSparkle}`,
                  animationDuration: "4s",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 z-0 rounded-card opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(to top, rgba(${theme.rgb[0]},${theme.rgb[1]},${theme.rgb[2]},0.38) 0%, rgba(${theme.rgb[0]},${theme.rgb[1]},${theme.rgb[2]},0.12) 40%, transparent 78%)`,
                }}
              />
            </>
          ) : null}

          <div
            ref={containerRef}
            className="group relative z-10 overflow-hidden rounded-2xl bg-black shadow-2xl"
            style={{ border: `1px solid ${theme.border}`, boxShadow: theme.glow }}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => {
              if (isPlaying) setShowControls(false);
            }}
          >
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="relative z-0 aspect-video w-full bg-black object-contain"
              playsInline
              preload="metadata"
              onClick={() => void togglePlayback()}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <p className="text-lg font-semibold text-white">Video not available yet</p>
              <p className="max-w-md text-sm text-white/65">
                Add an MP4 link in the admin CMS for this{" "}
                {isMovie ? "title" : "episode"} to enable playback.
              </p>
            </div>
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[4] bg-gradient-to-t from-black/85 via-transparent to-black/35 transition-opacity duration-500",
              controlsVisible || !videoUrl ? "opacity-100" : "opacity-0",
            )}
          />

          {videoUrl ? (
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-10 space-y-3 p-4 transition-opacity duration-500",
                controlsVisible ? "opacity-100" : "opacity-0",
              )}
            >
              <input
                type="range"
                min={0}
                max={progressMax}
                step={0.1}
                value={progress}
                onChange={(event) => handleSeek(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer"
                style={{ accentColor: theme.slider }}
                aria-label="Playback progress"
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isMovie ? (
                    <button
                      type="button"
                      onClick={goPrevious}
                      disabled={!hasPrevious}
                      aria-label="Previous episode"
                      className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <SkipBack className="size-5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void togglePlayback()}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="cursor-pointer rounded-full p-2.5 text-white transition-transform hover:scale-105"
                    style={{ background: theme.gradient, boxShadow: theme.glow }}
                  >
                    {isPlaying ? (
                      <Pause className="size-5 fill-current" />
                    ) : (
                      <Play className="size-5 fill-current" />
                    )}
                  </button>
                  {!isMovie ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!hasNext}
                      aria-label="Next episode"
                      className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <SkipForward className="size-5" />
                    </button>
                  ) : null}
                  <span className="ml-1 text-xs text-white/75">
                    {formatTime(progress)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMuted((current) => !current)}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/10"
                  >
                    {muted ? (
                      <VolumeX className="size-5" />
                    ) : (
                      <Volume2 className="size-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setVolume(next);
                      setMuted(next === 0);
                    }}
                    className="hidden w-20 cursor-pointer sm:block"
                    style={{ accentColor: theme.slider }}
                    aria-label="Volume"
                  />
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    aria-label="Fullscreen"
                    className="cursor-pointer rounded-full p-2 text-white transition-colors hover:bg-white/10"
                  >
                    <Maximize className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        </div>

        {showEpisodeDetails ? (
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{ borderColor: theme.border, backgroundColor: theme.activeRow }}
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
              {isMovie ? "About this film" : "About this episode"}
            </h2>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {!isMovie ? (
                <Chip chipKey="show" className="h-6 gap-1 text-caption">
                  S{activeEpisode!.seasonNumber ?? 1} · E{activeEpisode!.number}
                </Chip>
              ) : null}
              {activeEpisode!.duration ? (
                <Chip chipKey="ost" className="h-6 gap-1 text-caption">
                  <Clock className="size-3" />
                  {activeEpisode!.duration}
                </Chip>
              ) : null}
              {activeEpisode!.rating != null ? (
                <Chip chipKey="rating" className="h-6 gap-1 text-caption">
                  <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  {formatRating(activeEpisode!.rating)}/10
                </Chip>
              ) : null}
              {activeEpisode!.language ? (
                <Chip
                  language={activeEpisode!.language.toLowerCase()}
                  className="h-6 gap-1 text-caption"
                >
                  <Globe className="size-3" />
                  {activeEpisode!.language}
                </Chip>
              ) : null}
              {activeEpisode!.releaseDate ? (
                <Chip chipKey="default" className="h-6 gap-1 text-caption">
                  <Calendar className="size-3" />
                  {activeEpisode!.releaseDate}
                </Chip>
              ) : null}
            </div>

            {activeEpisode!.description?.trim() ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
                {activeEpisode!.description.trim()}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isMovie && session.episodes.length > 1 ? (
        <aside
          className="flex w-full shrink-0 flex-col gap-3 rounded-2xl border p-3 lg:sticky lg:top-[calc(4.5rem+1.5rem)] lg:h-[calc(100dvh-4.5rem-3rem)] lg:w-[320px] lg:p-4"
          style={{ borderColor: theme.border, backgroundColor: theme.panelBg }}
        >
          <h2 className="shrink-0 text-sm font-bold uppercase tracking-wide text-white/70">
            Episodes
          </h2>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {session.episodes.map((episode) => {
              const isActive = episode.id === activeEpisodeId;
              const label = formatEpisodeDisplayTitle(
                episode.title,
                episode.number,
              );
              return (
                <button
                  key={episode.id}
                  type="button"
                  onClick={() => goToEpisode(episode.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-300",
                    isActive
                      ? ""
                      : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10",
                  )}
                  style={
                    isActive
                      ? {
                          borderColor: theme.border,
                          backgroundColor: theme.activeRow,
                          boxShadow: `inset 3px 0 0 ${theme.primary}`,
                        }
                      : undefined
                  }
                >
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-black/50">
                    {episode.thumbnailUrl ? (
                      <HdImage
                        src={episode.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-full items-center justify-center text-xs font-bold text-white/70"
                        style={{ background: theme.gradientSoft }}
                      >
                        E{episode.number}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {label}
                    </span>
                    <span className="block text-xs text-white/55">
                      S{episode.seasonNumber ?? 1} · E{episode.number}
                      {episode.duration ? ` · ${episode.duration}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
      </div>
    </>
  );
}
