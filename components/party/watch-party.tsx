"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Clapperboard, ExternalLink, Pause, Play, RotateCcw, RotateCw, Tv, X } from "lucide-react";
import { GroupPicksPanel } from "@/components/party/group-picks";
import { MediaPicker, MemberStrip, PartyChat, ReactionBar, ReactionLayer, formatClock } from "@/components/party/party-shared";
import { usePlaybackMinutes } from "@/hooks/use-playback-minutes";
import { useParty } from "@/hooks/use-party";
import { expectedPosition, type PartyMediaMode, type PartyState } from "@/lib/party/types";
import { cn } from "@/lib/utils";

/** How far a member can drift from the party before we snap them back (seconds). */
const DRIFT_S = 1.5;

const MODE_LABELS: Record<PartyMediaMode, string> = {
  video: "Full video",
  youtube: "Official trailer",
  clock: "Watch together clock",
  audio: "Audio",
};

// ---- YouTube IFrame API (minimal typing) -------------------------------------------------

interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}
declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YtPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<void> | null = null;
function loadYouTubeApi() {
  ytReady ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytReady;
}

/** Keeps a media element in step with the party's clock. */
function useSync(state: PartyState | null, skew: React.MutableRefObject<number>, apply: (target: number, playing: boolean) => void) {
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    if (!state?.media) return;
    const tick = () => applyRef.current(expectedPosition(state, skew.current), state.playing);
    tick();
    const timer = window.setInterval(tick, 2_000);
    return () => window.clearInterval(timer);
  }, [state, skew]);
}

function VideoPlayer({ state, skew, onBlocked }: { state: PartyState; skew: React.MutableRefObject<number>; onBlocked: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useSync(state, skew, (target, playing) => {
    const video = ref.current;
    if (!video) return;
    if (Math.abs(video.currentTime - target) > DRIFT_S) video.currentTime = target;
    if (playing && video.paused) void video.play().catch(onBlocked);
    if (!playing && !video.paused) video.pause();
  });
  return <video ref={ref} src={state.media!.src} playsInline className="size-full bg-black object-contain" />;
}

function YouTubePlayer({ state, skew }: { state: PartyState; skew: React.MutableRefObject<number> }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const videoId = state.media!.src;

  useEffect(() => {
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !mount.current || !window.YT) return;
      player.current = new window.YT.Player(mount.current, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1 },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId]);

  useSync(state, skew, (target, playing) => {
    const yt = player.current;
    if (!yt?.getCurrentTime) return;
    if (Math.abs(yt.getCurrentTime() - target) > DRIFT_S) yt.seekTo(target, true);
    const isPlaying = yt.getPlayerState() === 1;
    if (playing && !isPlaying) yt.playVideo();
    if (!playing && isPlaying) yt.pauseVideo();
  });
  return <div ref={mount} className="size-full" />;
}

function ClockPlayer({ state, skew }: { state: PartyState; skew: React.MutableRefObject<number> }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(expectedPosition(state, skew.current));
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [state, skew]);
  const total = state.media?.durationSec ?? 0;
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-purple/40 via-black to-black p-6 text-center">
      <Clapperboard className="size-8 text-brand-pink" aria-hidden />
      <p className="text-5xl font-bold tabular-nums text-white sm:text-7xl">{formatClock(now)}</p>
      {total ? (
        <span className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/15">
          <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${Math.min(100, (now / total) * 100)}%` }} />
        </span>
      ) : null}
      <p className="max-w-md text-sm text-white/70">
        Open <span className="font-semibold text-white">{state.media?.title}</span> on your streaming service and match this
        clock. When the host pauses, everyone pauses.
      </p>
      <Link href={`/content/${state.media?.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs text-white/85 hover:bg-white/10">
        Where to watch <ExternalLink className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export interface WatchPartyProps {
  channelId: string;
  channelTitle: string;
  viewerUserId?: string;
  onClose: () => void;
}

/** Synced watch party for one community watch channel. */
export function WatchParty({ channelId, channelTitle, viewerUserId, onClose }: WatchPartyProps) {
  const { state, chat, reactions, connected, error, skewMs, control, sendChat, react } = useParty(`watch:${channelId}`);
  const [blocked, setBlocked] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const isHost = Boolean(state && viewerUserId && state.hostId === viewerUserId);
  const media = state?.media ?? null;
  const host = state?.members.find((member) => member.userId === state.hostId);

  // Watching together counts toward analytics, roadmaps and the daily limit.
  usePlaybackMinutes(media?.kind === "content" ? `/api/content/${encodeURIComponent(media.slug)}/watch-event` : null, Boolean(state?.playing), { requireVisible: true });

  useEffect(() => {
    const timer = window.setInterval(() => forceTick((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const position = state ? expectedPosition(state, skewMs.current) : 0;
  const total = media?.durationSec ?? 0;
  const shown = scrub ?? position;

  // Portalled to <body>: inside the community panel a transformed ancestor would clip a `fixed` overlay.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Watch party: ${channelTitle}`} className="fixed inset-0 z-[300] flex flex-col bg-background/98 backdrop-blur">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-brand-pink">
            <Tv className="size-3.5" aria-hidden /> Watch party {connected ? <span className="size-1.5 rounded-full bg-emerald-400" /> : null}
          </p>
          <h2 className="truncate text-base font-bold text-white">{media ? media.title : channelTitle}</h2>
        </div>
        <button type="button" onClick={onClose} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
          <X className="size-4" aria-hidden /> Leave
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
        <div className="flex min-w-0 shrink-0 flex-col gap-3 lg:min-h-0 lg:flex-[2] lg:overflow-y-auto lg:pr-1">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
            {media?.mode === "video" ? <VideoPlayer state={state!} skew={skewMs} onBlocked={() => setBlocked(true)} /> : null}
            {media?.mode === "youtube" ? <YouTubePlayer state={state!} skew={skewMs} /> : null}
            {media?.mode === "clock" ? <ClockPlayer state={state!} skew={skewMs} /> : null}
            {!media ? (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/60">
                <Tv className="size-8 text-white/30" aria-hidden />
                {isHost ? "Pick a title below to start the party." : `Waiting for ${host?.name ?? "the host"} to pick a title…`}
              </div>
            ) : null}
            {blocked ? (
              <button type="button" onClick={() => setBlocked(false)} className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 text-sm font-semibold text-white">
                Tap to join playback
              </button>
            ) : null}
            <ReactionLayer reactions={reactions} />
          </div>

          {media ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span className="w-14 text-right text-caption tabular-nums text-white/60">{formatClock(shown)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(total, shown + 1, 1)}
                  step={1}
                  value={Math.min(shown, Math.max(total, shown + 1))}
                  disabled={!isHost}
                  aria-label="Seek"
                  onChange={(event) => setScrub(Number(event.target.value))}
                  onPointerUp={() => {
                    if (scrub !== null) control({ action: "seek", positionSec: scrub });
                    setScrub(null);
                  }}
                  onKeyUp={() => {
                    if (scrub !== null) control({ action: "seek", positionSec: scrub });
                    setScrub(null);
                  }}
                  className="min-w-0 flex-1 accent-brand-magenta disabled:opacity-60"
                />
                <span className="w-14 text-caption tabular-nums text-white/60">{total ? formatClock(total) : "--:--"}</span>
              </div>
              {isHost ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => control({ action: "seek", positionSec: Math.max(0, position - 10) })} aria-label="Back 10 seconds" className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/15">
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => control(state?.playing ? { action: "pause", positionSec: position } : { action: "play", positionSec: position })}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white"
                  >
                    {state?.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                    {state?.playing ? "Pause for everyone" : "Play for everyone"}
                  </button>
                  <button type="button" onClick={() => control({ action: "seek", positionSec: position + 10 })} aria-label="Forward 10 seconds" className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/15">
                    <RotateCw className="size-4" aria-hidden />
                  </button>
                  {media.available.length > 1 ? (
                    <div role="radiogroup" aria-label="Play as" className="ms-auto flex flex-wrap gap-1">
                      {media.available.map((mode) => (
                        <button key={mode} type="button" role="radio" aria-checked={media.mode === mode} onClick={() => control({ action: "mode", mode })} className={cn("cursor-pointer rounded-full px-3 py-1.5 text-caption", media.mode === mode ? "bg-white/15 text-white" : "text-white/55 hover:text-white")}>
                          {MODE_LABELS[mode]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-caption text-white/50">{host?.name ?? "The host"} controls playback · {MODE_LABELS[media.mode]}</p>
              )}
            </div>
          ) : null}

          {state ? (
            <GroupPicksPanel
              communitySlug={state.communitySlug}
              mode="watch"
              memberIds={state.members.map((member) => member.userId)}
              isHost={isHost}
              onPlay={(slug) => control({ action: "load", item: { kind: "content", slug } })}
              onSuggest={sendChat}
            />
          ) : null}
          {isHost ? <MediaPicker type="content" placeholder={media ? "Switch to another title…" : "Search a title to watch together…"} onPick={(slug) => control({ action: "load", item: { kind: "content", slug } })} /> : null}
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}
        </div>

        <aside className="flex min-h-[320px] shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:min-h-0 lg:flex-1 lg:shrink">
          {state ? <MemberStrip members={state.members} hostId={state.hostId} /> : null}
          <ReactionBar onReact={react} />
          <PartyChat messages={chat} onSend={sendChat} viewerUserId={viewerUserId} />
        </aside>
      </div>
    </div>,
    document.body,
  );
}
