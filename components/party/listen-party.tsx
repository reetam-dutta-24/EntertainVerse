"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, ListMusic, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { MediaPicker, MemberStrip, PartyChat, ReactionBar, ReactionLayer, formatClock } from "@/components/party/party-shared";
import { usePlaybackMinutes } from "@/hooks/use-playback-minutes";
import { useParty } from "@/hooks/use-party";
import { expectedPosition } from "@/lib/party/types";
import { cn } from "@/lib/utils";

const DRIFT_S = 1.2;

/** The community's listen party: a shared queue everyone hears in sync. */
export function ListenParty({ communitySlug, viewerUserId }: { communitySlug: string; viewerUserId?: string }) {
  const { state, chat, reactions, connected, error, skewMs, control, sendChat, react } = useParty(`listen:${communitySlug}`);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [position, setPosition] = useState(0);
  const isHost = Boolean(state && viewerUserId && state.hostId === viewerUserId);
  const media = state?.media ?? null;
  const host = state?.members.find((member) => member.userId === state.hostId);

  usePlaybackMinutes(media ? `/api/song/${encodeURIComponent(media.slug)}/listen` : null, Boolean(state?.playing));

  // Keep the audio element on the party's clock.
  useEffect(() => {
    if (!state?.media) return;
    const tick = () => {
      const audio = audioRef.current;
      const target = expectedPosition(state, skewMs.current);
      setPosition(target);
      if (!audio) return;
      if (Math.abs(audio.currentTime - target) > DRIFT_S && target < (audio.duration || Infinity)) audio.currentTime = target;
      if (state.playing && audio.paused) void audio.play().catch(() => setBlocked(true));
      if (!state.playing && !audio.paused) audio.pause();
    };
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [state, skewMs]);

  const queue = state?.queue ?? [];
  const index = state?.index ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-purple/30 via-black/40 to-black/40 p-5 sm:flex-row sm:items-center">
            <span className={cn("relative size-36 shrink-0 overflow-hidden rounded-2xl bg-white/10 shadow-card-inner", state?.playing && "ring-2 ring-brand-magenta/70")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {media?.imageUrl ? <img src={media.imageUrl} alt="" className="size-full object-cover" /> : <Headphones className="m-auto mt-12 size-10 text-white/30" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="flex items-center justify-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-brand-pink sm:justify-start">
                <Headphones className="size-3.5" aria-hidden /> Listen party {connected ? <span className="size-1.5 rounded-full bg-emerald-400" /> : null}
              </p>
              <p className="mt-1 truncate text-lg font-bold text-white">{media?.title ?? "Nothing playing yet"}</p>
              <p className="truncate text-sm text-white/60">{media?.subtitle ?? (isHost ? "Add a song to start the party" : `Waiting for ${host?.name ?? "the host"}…`)}</p>
              {media ? (
                <p className="mt-2 text-caption tabular-nums text-white/50">
                  {formatClock(position)}
                  {media.durationSec ? ` / ${formatClock(media.durationSec)}` : ""}
                </p>
              ) : null}
              {isHost && media ? (
                <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                  <button type="button" onClick={() => control({ action: "previous" })} aria-label="Previous" className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/15">
                    <SkipBack className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => control(state?.playing ? { action: "pause", positionSec: position } : { action: "play", positionSec: position })} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white">
                    {state?.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                    {state?.playing ? "Pause" : "Play for everyone"}
                  </button>
                  <button type="button" onClick={() => control({ action: "next" })} aria-label="Next" className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/15">
                    <SkipForward className="size-4" aria-hidden />
                  </button>
                </div>
              ) : media ? (
                <p className="mt-2 text-caption text-white/50">{host?.name ?? "The host"} runs the decks — you can add songs.</p>
              ) : null}
            </div>
            <ReactionLayer reactions={reactions} />
            {blocked ? (
              <button type="button" onClick={() => setBlocked(false)} className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/70 text-sm font-semibold text-white">
                Tap to start listening
              </button>
            ) : null}
          </div>
          {media ? (
            <audio
              ref={audioRef}
              src={media.src}
              preload="auto"
              onEnded={() => {
                if (isHost) control({ action: "next" });
              }}
              className="hidden"
            />
          ) : null}
          <MediaPicker type="song" placeholder="Add a song to the queue…" onPick={(slug) => control({ action: "enqueue", item: { kind: "track", slug } })} />
          {error ? <p className="text-sm text-amber-100">{error}</p> : null}

          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/55">
              <ListMusic className="size-3.5" aria-hidden /> Up next · {queue.length} song{queue.length === 1 ? "" : "s"}
            </p>
            {queue.length ? (
              <ol className="flex flex-col gap-1">
                {queue.map((item, position) => (
                  <li key={`${item.slug}-${position}`} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-1.5", position === index && "bg-brand-magenta/15")}>
                    <span className="w-5 text-center text-caption text-white/45">{position === index ? "▶" : position + 1}</span>
                    <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : null}
                    </span>
                    <button type="button" disabled={!isHost} onClick={() => control({ action: "jump", index: position })} className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-default">
                      <span className="block truncate text-sm text-white">{item.title}</span>
                      <span className="block truncate text-caption text-white/50">{item.subtitle}</span>
                    </button>
                    {isHost && position !== index ? (
                      <button type="button" onClick={() => control({ action: "remove", index: position })} aria-label={`Remove ${item.title}`} className="cursor-pointer rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
                        <X className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-caption text-white/45">The queue is empty — search a song above.</p>
            )}
          </div>
        </div>

        <aside className="flex min-h-[320px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          {state ? <MemberStrip members={state.members} hostId={state.hostId} /> : null}
          <ReactionBar onReact={react} />
          <PartyChat messages={chat} onSend={sendChat} viewerUserId={viewerUserId} />
        </aside>
      </div>
      <p className="text-caption text-white/40">
        Songs play from licensed full audio where an admin added it, otherwise the official 30-second preview.
      </p>
    </div>
  );
}
