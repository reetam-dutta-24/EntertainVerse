"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import Link from "next/link";
import {
  ExternalLink,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCollectionDetailPath } from "@/lib/collection-routes";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { getContentDetailPath, getContentWatchPathForQueueItem } from "@/lib/content-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import {
  getSynopsisWindow,
} from "@/lib/lyrics-display";
import { SongLyricsPanel } from "@/components/song/song-lyrics-panel";
import { getPlayAccentTheme, type PlayAccentTheme } from "@/lib/play-ambient";
import { getTrackCoverUrl } from "@/lib/music-preview";
import {
  PLAY_HEADER_COVER,
  PLAY_NOW_PLAYING_COVER,
  PLAY_QUEUE_COVER_LG,
  PLAY_QUEUE_COVER_MD,
  PLAY_QUEUE_COVER_SM,
} from "@/lib/play-layout";
import { moveToPlayNext, removeQueueItem } from "@/lib/play-queue-utils";
import { PlayAmbientBackground } from "@/components/collection/play-ambient-background";
import { PlayQueueRowActions } from "@/components/collection/play-queue-row-actions";
import { Chip, RatingChip } from "@/components/ui/chip";
import { HdImage } from "@/components/ui/hd-image";
import type {
  CollectionPlayContentItem,
  CollectionPlayQueue,
  CollectionPlayTrack,
} from "@/types";
import { usePlayerShortcuts } from "@/hooks/use-player-shortcuts";

interface CollectionPlayViewProps {
  collectionSlug?: string;
  artistSlug?: string;
  initialQueue?: CollectionPlayQueue;
}

type PlaySource = "collection" | "artist";

const PLAY_MIN_H = "min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4.5rem)]";
const PLAY_STICKY_TOP = "lg:sticky lg:top-[4.5rem]";
const PLAY_PANEL_H = "lg:h-[calc(100dvh-4.5rem)]";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function kindLabel(kind: string) {
  if (kind === "ost") return "OST";
  if (kind === "album") return "Album";
  return "Song";
}

function QueueCover({
  imageUrl,
  title,
  size = "md",
  theme,
}: {
  imageUrl?: string;
  title: string;
  size?: "sm" | "md" | "lg";
  theme?: PlayAccentTheme;
}) {
  const sizeClass =
    size === "sm"
      ? PLAY_QUEUE_COVER_SM
      : size === "lg"
        ? PLAY_QUEUE_COVER_LG
        : PLAY_QUEUE_COVER_MD;

  return (
    <span className={sizeClass}>
      {imageUrl ? (
        <HdImage
          src={imageUrl}
          alt=""
          className="block size-full object-cover object-center"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center text-xs font-bold text-white/70"
          style={{ background: theme?.gradientSoft }}
        >
          {title.charAt(0)}
        </span>
      )}
    </span>
  );
}

function PlayNowPlayingCover({
  imageUrl,
  title,
  subtitle,
  fallbackChar,
  theme,
}: {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  fallbackChar: string;
  theme: PlayAccentTheme;
}) {
  return (
    <div
      className={PLAY_NOW_PLAYING_COVER}
      style={{ borderColor: theme.border }}
    >
      {imageUrl ? (
        <HdImage
          src={imageUrl}
          alt=""
          className="block size-full object-cover object-center"
        />
      ) : (
        <div
          className="flex size-full items-center justify-center text-3xl font-bold text-white/60"
          style={{ background: theme.gradientSoft }}
        >
          {fallbackChar}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4" aria-live="polite">
        <p className="truncate text-lg font-bold text-white">{title}</p>
        {subtitle ? (
          <p className="truncate text-sm capitalize text-white/70">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function CollectionPlayHeader({
  label,
  name,
  description,
  meta,
  imageUrl,
  theme,
  action,
}: {
  label: string;
  name: string;
  description?: string;
  meta: string;
  imageUrl?: string;
  theme: PlayAccentTheme;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start gap-5 sm:mb-7 sm:gap-6 lg:gap-7">
      <div className={PLAY_HEADER_COVER} style={{ borderColor: theme.border }}>
        {imageUrl ? (
          <HdImage
            src={imageUrl}
            alt=""
            className="block size-full object-cover object-center"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center text-2xl font-bold text-white/60 sm:text-3xl"
            style={{ background: theme.gradientSoft }}
          >
            {name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 sm:gap-3">
        <p className="text-micro font-semibold uppercase tracking-widest text-white/55 sm:text-xs">
          {label}
        </p>
        <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
          {name}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-white/60 sm:text-body">
            {description}
          </p>
        ) : null}
        <p className="text-xs text-white/45 sm:text-sm">{meta}</p>
        {action ? <div className="pt-1 sm:pt-1.5">{action}</div> : null}
      </div>
    </header>
  );
}

function SynopsisPanel({
  synopsis,
  activeIndex,
  theme,
}: {
  synopsis?: string;
  activeIndex: number;
  theme: PlayAccentTheme;
}) {
  const lines = useMemo(
    () => getSynopsisWindow(synopsis, activeIndex, 4),
    [synopsis, activeIndex],
  );

  if (!synopsis?.trim()) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
        <p className="text-xs text-white/40">No synopsis available.</p>
      </div>
    );
  }

  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-xl border px-4 py-5"
      style={{
        borderColor: theme.border,
        backgroundColor: theme.panelBg,
      }}
    >
      <p className="text-micro font-semibold uppercase tracking-widest text-white/40">
        About this title
      </p>
      <div className="flex min-h-[7rem] flex-col justify-center gap-2">
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className={cn(
              "text-sm leading-relaxed",
              index === 0 ? "font-medium" : "text-white/60",
            )}
            style={index === 0 ? { color: theme.primaryMuted } : undefined}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function MusicPlayQueue({
  queue,
  entitySlug,
  playSource,
}: {
  queue: CollectionPlayQueue & { tracks: CollectionPlayTrack[] };
  entitySlug: string;
  playSource: PlaySource;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState(queue.tracks);
  useOnValueChange(queue.tracks, (next) => setTracks(next));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const canManage = queue.canManage ?? false;

  const currentTrack = tracks[currentIndex];

  const playIndex = useCallback(
    async (index: number, autoplay = true) => {
      if (index < 0 || index >= tracks.length) return;
      setCurrentIndex(index);
      setProgress(0);
      const audio = audioRef.current;
      if (!audio) return;

      const track = tracks[index];
      audio.src = track.previewUrl;
      audio.load();
      if (autoplay) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    },
    [tracks],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const el: HTMLAudioElement = audioEl;

    function onTimeUpdate() {
      setProgress(el.currentTime);
    }
    function onLoadedMetadata() {
      setDuration(el.duration || currentTrack?.durationSeconds || 0);
    }
    function onEnded() {
      if (currentIndex < tracks.length - 1) {
        void playIndex(currentIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }

    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("loadedmetadata", onLoadedMetadata);
    audioEl.addEventListener("ended", onEnded);
    return () => {
      audioEl.removeEventListener("timeupdate", onTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", onLoadedMetadata);
      audioEl.removeEventListener("ended", onEnded);
    };
  }, [currentIndex, currentTrack?.durationSeconds, playIndex, tracks.length]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (!audio.src) {
      await playIndex(currentIndex);
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }

  function handleStop() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setProgress(0);
    setIsPlaying(false);
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setProgress(value);
  }

  usePlayerShortcuts({
    onTogglePlay: () => void togglePlay(),
    onSeekBy: (delta) => {
      const audio = audioRef.current;
      if (!audio) return;
      handleSeek(Math.min(Math.max(audio.currentTime + delta, 0), audio.duration || 0));
    },
    onToggleMute: () => setVolume((current) => (current > 0 ? 0 : 0.8)),
  });

  const handleAddToQueue = useCallback(
    (index: number) => {
      if (index === currentIndex || index === currentIndex + 1) return;
      const { items, newCurrentIndex } = moveToPlayNext(
        tracks,
        index,
        currentIndex,
      );
      setTracks(items);
      setCurrentIndex(newCurrentIndex);
    },
    [tracks, currentIndex],
  );

  const handleRemove = useCallback(
    async (itemId: string, index: number): Promise<boolean> => {
      if (playSource !== "collection") return false;
      setDeleteLoadingId(itemId);
      try {
        const response = await fetch(
          `/api/collections/${encodeURIComponent(entitySlug)}/items/${encodeURIComponent(itemId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          return false;
        }

        const wasCurrent = index === currentIndex;
        const wasPlaying = isPlaying && wasCurrent;
        const { items, newCurrentIndex } = removeQueueItem(
          tracks,
          index,
          currentIndex,
        );
        setTracks(items);

        if (items.length === 0) {
          const audio = audioRef.current;
          if (audio) {
            audio.pause();
            audio.src = "";
          }
          setIsPlaying(false);
          setProgress(0);
          setCurrentIndex(0);
          return true;
        }

        setCurrentIndex(newCurrentIndex);

        if (wasCurrent) {
          const audio = audioRef.current;
          const nextTrack = items[newCurrentIndex];
          if (!audio || !nextTrack) return true;
          audio.src = nextTrack.previewUrl;
          audio.load();
          setProgress(0);
          if (wasPlaying) {
            try {
              await audio.play();
              setIsPlaying(true);
            } catch {
              setIsPlaying(false);
            }
          } else {
            setIsPlaying(false);
          }
        }
        return true;
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [entitySlug, playSource, tracks, currentIndex, isPlaying],
  );

  const progressMax = duration || currentTrack?.durationSeconds || 1;
  const nowPlayingCoverUrl = currentTrack
    ? getTrackCoverUrl(
        currentTrack.id,
        currentTrack.imageUrl,
        currentTrack.backdropUrl,
      )
    : undefined;
  const theme = useMemo(
    () => getPlayAccentTheme(currentTrack?.accent),
    [currentTrack?.accent],
  );

  return (
    <div className={cn("relative w-full", PLAY_MIN_H)}>
      <PlayAmbientBackground accent={currentTrack?.accent} />

      <div className={cn("relative z-10 grid lg:grid-cols-[7fr_3fr]", PLAY_MIN_H)}>
      <audio ref={audioRef} preload="metadata" className="hidden" />

      {/* Left 70% — queue */}
      <div className="overflow-y-auto border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r">
        <CollectionPlayHeader
          label={playSource === "artist" ? "Artist playlist" : "Music playlist"}
          name={queue.name}
          description={queue.description}
          meta={
            playSource === "artist"
              ? `${tracks.length} songs`
              : `${queue.ownerName} · ${tracks.length} songs`
          }
          imageUrl={queue.imageUrl}
          theme={theme}
          action={
            <button
              type="button"
              onClick={() => void playIndex(0)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:opacity-95"
              style={{ background: theme.gradient, boxShadow: theme.glow }}
            >
              <Play className="size-4 fill-current" />
              Play all
            </button>
          }
        />

        <div className="mb-2 hidden grid-cols-[40px_60px_minmax(0,1fr)_72px_80px] gap-3 border-b border-white/[0.08] px-2 pb-2 text-micro font-medium uppercase tracking-wide text-white/40 sm:grid">
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>
          <span className="text-right">Time</span>
          <span />
        </div>

        <ol className="flex flex-col gap-0.5">
          {tracks.map((track, index) => {
            const active = index === currentIndex;
            return (
              <li key={track.itemId}>
                <div
                  className={cn(
                    "group grid w-full grid-cols-[32px_60px_minmax(0,1fr)_56px_72px] items-center gap-3 rounded-lg px-2 py-2.5 sm:grid-cols-[40px_60px_minmax(0,1fr)_72px_80px]",
                    !active && "hover:bg-white/[0.05]",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: theme.activeRow,
                          boxShadow: `inset 3px 0 0 ${theme.primary}`,
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => void playIndex(index)}
                    className="contents text-left"
                  >
                    <span className="text-center text-sm text-white/50 group-hover:hidden">
                      {active && isPlaying ? (
                        <span
                          className="inline-block size-2 animate-pulse rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                      ) : (
                        track.position
                      )}
                    </span>
                    <span
                      className="hidden group-hover:inline"
                      style={{ color: theme.primary }}
                    >
                      {active && isPlaying ? (
                        <Pause className="mx-auto size-4" />
                      ) : (
                        <Play className="mx-auto size-4 fill-current" />
                      )}
                    </span>

                    <QueueCover
                      imageUrl={track.imageUrl}
                      title={track.title}
                      theme={theme}
                    />

                    <span className="min-w-0">
                      <span
                        className="block truncate text-sm font-medium"
                        style={active ? { color: theme.primary } : { color: "white" }}
                      >
                        {track.title}
                      </span>
                      <span className="block truncate text-xs text-white/55">
                        {track.artist}
                        {track.source ? ` · ${track.source}` : ""}
                      </span>
                    </span>

                    <span className="text-right text-xs text-white/45">
                      {track.durationLabel}
                    </span>
                  </button>

                  <PlayQueueRowActions
                    onAddToQueue={() => handleAddToQueue(index)}
                    onDelete={() => handleRemove(track.itemId, index)}
                    canDelete={canManage}
                    itemTitle={track.title}
                    collectionName={queue.name}
                    addDisabled={
                      index === currentIndex || index === currentIndex + 1
                    }
                    deleteLoading={deleteLoadingId === track.itemId}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right 30% — now playing */}
      <aside
        className={cn(
          "flex flex-col overflow-y-auto px-4 py-4 sm:px-5 sm:py-5",
          PLAY_STICKY_TOP,
          PLAY_PANEL_H,
        )}
        style={{
          borderLeft: `1px solid ${theme.border}`,
          backgroundColor: theme.panelBg,
        }}
      >
        {currentTrack ? (
          <>
            <PlayNowPlayingCover
              imageUrl={nowPlayingCoverUrl}
              title={currentTrack.title}
              subtitle={currentTrack.artist}
              fallbackChar={currentTrack.title.charAt(0)}
              theme={theme}
            />

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip musicKind={currentTrack.kind}>
                {kindLabel(currentTrack.kind)}
              </Chip>
              {currentTrack.source ? (
                <Chip chipKey="show">{currentTrack.source}</Chip>
              ) : null}
              {currentTrack.genreLabels.map((genre) => (
                <Chip key={genre.id} genreId={genre.id} genreLabel={genre.label}>
                  {genre.label}
                </Chip>
              ))}
              {currentTrack.rating ? (
                <RatingChip rating={currentTrack.rating} />
              ) : null}
            </div>

            {currentTrack.description ? (
              <p className="mt-3 line-clamp-2 text-xs text-white/55">
                {currentTrack.description}
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <input
                type="range"
                min={0}
                max={progressMax}
                step={1}
                value={progress}
                onChange={(event) => handleSeek(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer"
                style={{ accentColor: theme.slider }}
                aria-label="Playback progress"
              />
              <div className="flex justify-between text-caption text-white/45">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(progressMax)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label="Previous track"
                disabled={currentIndex === 0}
                onClick={() => void playIndex(currentIndex - 1)}
                className="rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <SkipBack className="size-5" />
              </button>
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => void togglePlay()}
                className="rounded-full p-3 text-white shadow-lg transition hover:scale-105"
                style={{ background: theme.gradient, boxShadow: theme.glow }}
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5 fill-current" />
                )}
              </button>
              <button
                type="button"
                aria-label="Stop"
                onClick={handleStop}
                className="rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Square className="size-4 fill-current" />
              </button>
              <button
                type="button"
                aria-label="Next track"
                disabled={currentIndex >= tracks.length - 1}
                onClick={() => void playIndex(currentIndex + 1)}
                className="rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <SkipForward className="size-5" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Volume2 className="size-4 shrink-0 text-white/45" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-1 flex-1 cursor-pointer"
                style={{ accentColor: theme.slider }}
                aria-label="Volume"
              />
            </div>

            <Link
              href={getSongDetailPath(currentTrack.id)}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs text-white/80 transition hover:bg-white/5"
              style={{ borderColor: theme.border }}
            >
              Open song page
              <ExternalLink className="size-3" />
            </Link>

            <SongLyricsPanel
              lyrics={currentTrack.lyrics}
              progress={progress}
              duration={progressMax}
              theme={theme}
              className="mt-4"
            />
          </>
        ) : (
          <p className="text-sm text-white/50">Select a track to start listening.</p>
        )}
      </aside>
      </div>
    </div>
  );
}

function ContentPlayQueue({
  queue,
  collectionSlug,
}: {
  queue: CollectionPlayQueue & { items: CollectionPlayContentItem[] };
  collectionSlug: string;
}) {
  const [items, setItems] = useState(queue.items);
  useOnValueChange(queue.items, (next) => setItems(next));
  const [activeIndex, setActiveIndex] = useState(0);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const canManage = queue.canManage ?? false;

  const activeItem = items[activeIndex];

  const activeWatchHref = activeItem
    ? getContentWatchPathForQueueItem(activeItem.id, {
        episodeId: activeItem.defaultEpisodeId,
      })
    : "#";

  const bannerUrl =
    activeItem?.backdropUrl ?? activeItem?.imageUrl ?? queue.imageUrl;
  const theme = useMemo(
    () => getPlayAccentTheme(activeItem?.accent),
    [activeItem?.accent],
  );

  const handleAddToQueue = useCallback(
    (index: number) => {
      if (index === activeIndex || index === activeIndex + 1) return;
      const { items: nextItems, newCurrentIndex } = moveToPlayNext(
        items,
        index,
        activeIndex,
      );
      setItems(nextItems);
      setActiveIndex(newCurrentIndex);
    },
    [items, activeIndex],
  );

  const handleRemove = useCallback(
    async (itemId: string, index: number): Promise<boolean> => {
      setDeleteLoadingId(itemId);
      try {
        const response = await fetch(
          `/api/collections/${encodeURIComponent(collectionSlug)}/items/${encodeURIComponent(itemId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          return false;
        }

        const { items: nextItems, newCurrentIndex } = removeQueueItem(
          items,
          index,
          activeIndex,
        );
        setItems(nextItems);
        setActiveIndex(
          nextItems.length === 0 ? 0 : Math.min(newCurrentIndex, nextItems.length - 1),
        );
        return true;
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [collectionSlug, items, activeIndex],
  );

  return (
    <div className={cn("relative w-full", PLAY_MIN_H)}>
      <PlayAmbientBackground accent={activeItem?.accent} />

      <div className={cn("relative z-10 grid lg:grid-cols-[7fr_3fr]", PLAY_MIN_H)}>
      {/* Left 70% — binge queue */}
      <div className="overflow-y-auto border-b border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5 lg:border-b-0 lg:border-r">
        <CollectionPlayHeader
          label="Content collection"
          name={queue.name}
          description={queue.description}
          meta={`${queue.ownerName} · ${items.length} titles`}
          imageUrl={queue.imageUrl}
          theme={theme}
        />

        <div className="mb-2 hidden grid-cols-[40px_60px_minmax(0,1fr)_120px] gap-3 border-b border-white/[0.08] px-2 pb-2 text-micro font-medium uppercase tracking-wide text-white/40 sm:grid">
          <span>#</span>
          <span>Cover</span>
          <span>Title</span>
          <span className="text-right">Actions</span>
        </div>

        <ol className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            const active = index === activeIndex;
            return (
              <li key={item.itemId}>
                <div
                  className={cn(
                    "group grid grid-cols-[40px_60px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 sm:grid-cols-[40px_60px_minmax(0,1fr)_120px]",
                    !active && "hover:bg-white/[0.05]",
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: theme.activeRow,
                          boxShadow: `inset 3px 0 0 ${theme.primary}`,
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className="contents text-left"
                  >
                    <span className="text-center text-sm text-white/50">
                      {active ? (
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                      ) : (
                        item.position
                      )}
                    </span>

                    <QueueCover
                      imageUrl={item.imageUrl}
                      title={item.title}
                      theme={theme}
                    />

                    <span className="min-w-0">
                      <span
                        className="block truncate text-sm font-medium"
                        style={active ? { color: theme.primary } : { color: "white" }}
                      >
                        {item.title}
                      </span>
                      <span className="block truncate text-xs capitalize text-white/55">
                        {item.type}
                        {item.meta ? ` · ${item.meta}` : ""}
                        {item.year ? ` · ${item.year}` : ""}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center justify-end gap-1">
                    <PlayQueueRowActions
                      onAddToQueue={() => handleAddToQueue(index)}
                      onDelete={() => handleRemove(item.itemId, index)}
                      canDelete={canManage}
                      itemTitle={item.title}
                      collectionName={queue.name}
                      addDisabled={
                        index === activeIndex || index === activeIndex + 1
                      }
                      deleteLoading={deleteLoadingId === item.itemId}
                    />
                    <Link
                      href={getContentWatchPathForQueueItem(item.id, {
                        episodeId: item.defaultEpisodeId,
                      })}
                      className="rounded-full border px-3 py-1 text-center text-xs text-white transition hover:bg-white/5"
                      style={{ borderColor: theme.border }}
                    >
                      Watch
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right 30% — now watching panel */}
      <aside
        className={cn(
          "flex flex-col overflow-y-auto px-4 py-4 sm:px-5 sm:py-5",
          PLAY_STICKY_TOP,
          PLAY_PANEL_H,
        )}
        style={{
          borderLeft: `1px solid ${theme.border}`,
          backgroundColor: theme.panelBg,
        }}
      >
        {activeItem ? (
          <>
            <PlayNowPlayingCover
              imageUrl={bannerUrl}
              title={activeItem.title}
              subtitle={`${activeItem.type}${activeItem.year ? ` · ${activeItem.year}` : ""}`}
              fallbackChar={activeItem.title.charAt(0)}
              theme={theme}
            />

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip mediaType={activeItem.type}>{activeItem.type}</Chip>
              {activeItem.genres.map((genre) => (
                <Chip key={genre.id} genreId={genre.id} genreLabel={genre.label}>
                  {genre.label}
                </Chip>
              ))}
              {activeItem.highlightTags?.map((tag) => (
                <Chip key={tag} chipKey="default">
                  {tag}
                </Chip>
              ))}
              {activeItem.rating ? (
                <RatingChip rating={activeItem.rating} />
              ) : null}
            </div>

            {activeItem.meta ? (
              <p className="mt-3 text-xs text-white/55">{activeItem.meta}</p>
            ) : null}

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                aria-label="Previous title"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex(activeIndex - 1)}
                className="rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <SkipBack className="size-5" />
              </button>
              <Link
                href={activeWatchHref}
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:opacity-95"
                style={{ background: theme.gradient, boxShadow: theme.glow }}
              >
                <Play className="size-4 fill-current" />
                Watch now
              </Link>
              <button
                type="button"
                aria-label="Next title"
                disabled={activeIndex >= items.length - 1}
                onClick={() => setActiveIndex(activeIndex + 1)}
                className="rounded-full p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <SkipForward className="size-5" />
              </button>
            </div>

            <p className="mt-3 text-center text-caption text-white/40">
              {activeIndex + 1} of {items.length} in queue
            </p>

            <Link
              href={getContentDetailPath(activeItem.id)}
              className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs text-white/80 transition hover:bg-white/5"
              style={{ borderColor: theme.border }}
            >
              Open title page
              <ExternalLink className="size-3" />
            </Link>

            <SynopsisPanel
              synopsis={activeItem.synopsis ?? activeItem.description}
              activeIndex={activeIndex}
              theme={theme}
            />
          </>
        ) : (
          <p className="text-sm text-white/50">Select a title to start watching.</p>
        )}
      </aside>
      </div>
    </div>
  );
}

export function CollectionPlayView({
  collectionSlug,
  artistSlug,
  initialQueue,
}: CollectionPlayViewProps) {
  const playSource: PlaySource = artistSlug ? "artist" : "collection";
  const entitySlug = artistSlug ?? collectionSlug ?? "";
  const [queue, setQueue] = useState<CollectionPlayQueue | null>(
    initialQueue ?? null,
  );
  const [loading, setLoading] = useState(!initialQueue);
  const [error, setError] = useState<string>();

  useOnValueChange(initialQueue, (next) => {
    if (!next) return;
    setQueue(next);
    setLoading(false);
    setError(undefined);
  });

  useEffect(() => {
    if (initialQueue) return;

    fetch(
      playSource === "artist"
        ? `/api/artist/${encodeURIComponent(entitySlug)}/play`
        : `/api/collections/${encodeURIComponent(entitySlug)}/play`,
    )
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not load playlist.",
          );
        }
        return response.json() as Promise<{ queue: CollectionPlayQueue }>;
      })
      .then((data) => setQueue(data.queue))
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [entitySlug, initialQueue, playSource]);

  const isEmpty = useMemo(() => {
    if (!queue) return false;
    return queue.itemCount === 0;
  }, [queue]);

  return (
    <div className={cn("relative w-full bg-transparent", PLAY_MIN_H)}>
      {loading ? (
        <p className="relative z-10 px-6 py-8 text-sm text-white/55">Loading playlist…</p>
      ) : error ? (
        <p className="relative z-10 px-6 py-8 text-sm text-red-400">{error}</p>
      ) : !queue ? (
        <p className="relative z-10 px-6 py-8 text-sm text-white/55">Playlist not found.</p>
      ) : isEmpty ? (
        <div className="relative z-10 px-6 py-8">
          <p className="text-sm text-white/55">
            {playSource === "artist"
              ? "This artist has no songs to play yet."
              : "This collection has no items yet. Add songs or titles from the collection page first."}
          </p>
          <Link
            href={
              playSource === "artist"
                ? getArtistDetailPath(entitySlug)
                : getCollectionDetailPath(entitySlug)
            }
            className="mt-4 inline-block text-sm font-semibold text-brand-magenta hover:underline"
          >
            {playSource === "artist" ? "Go to artist" : "Go to collection"}
          </Link>
        </div>
      ) : queue.collectionKind === "music" && queue.tracks?.length ? (
        <MusicPlayQueue
          queue={{ ...queue, tracks: queue.tracks }}
          entitySlug={entitySlug}
          playSource={playSource}
        />
      ) : queue.items?.length ? (
        <ContentPlayQueue
          queue={{ ...queue, items: queue.items }}
          collectionSlug={entitySlug}
        />
      ) : (
        <p className="relative z-10 px-6 py-8 text-sm text-white/55">Nothing to play.</p>
      )}
    </div>
  );
}
