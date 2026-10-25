"use client";

import { useState } from "react";
import { ChevronDown, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import type { GroupPicks } from "@/lib/services/group-picks.service";
import { cn } from "@/lib/utils";

export interface GroupPicksPanelProps {
  communitySlug: string;
  mode: "watch" | "listen";
  /** The people in the party right now. */
  memberIds: string[];
  isHost: boolean;
  /** Host: load this title/song for everyone. */
  onPlay: (slug: string) => void;
  /** Listen parties: anyone can queue a pick. */
  onQueue?: (slug: string) => void;
  /** Non-hosts suggest picks in the party chat. */
  onSuggest: (text: string) => void;
}

/** Group AI mode: picks that work for everyone in the party, with a fit per person. */
export function GroupPicksPanel({ communitySlug, mode, memberIds, isHost, onPlay, onQueue, onSuggest }: GroupPicksPanelProps) {
  const [data, setData] = useState<GroupPicks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/communities/${encodeURIComponent(communitySlug)}/group-picks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, userIds: memberIds }),
      });
      const body = (await response.json()) as { picks?: GroupPicks; error?: string };
      if (!response.ok || !body.picks) throw new Error(body.error ?? "Couldn't get group picks.");
      setData(body.picks);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Couldn't get group picks.");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void ask()}
          disabled={loading}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-magenta/50 bg-brand-magenta/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta/20"
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4 text-brand-pink" aria-hidden />}
          {mode === "watch" ? "What should we watch?" : "What should we listen to?"}
          <span className="text-caption font-normal text-white/55">· AI picks for all {memberIds.length}</span>
        </button>
        {error ? <p className="text-caption text-amber-100">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brand-magenta/30 bg-gradient-to-br from-brand-purple/20 via-black/30 to-black/30 p-3 sm:p-4" aria-label="Group picks">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-pink">
            <Sparkles className="size-3.5" aria-hidden /> Picked for all of you {data.vibe ? <span className="normal-case tracking-normal text-white/60">· {data.vibe}</span> : null}
          </p>
          <p className="mt-1 text-sm text-white/85">{data.verdict}</p>
        </div>
        <button type="button" onClick={() => setData(null)} aria-label="Close group picks" className="-m-1 shrink-0 cursor-pointer rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {data.picks.length ? (
        <ol className="flex flex-col gap-2">
          {data.picks.map((pick, position) => {
            const open = expanded === pick.slug;
            return (
              <li key={pick.slug} className={cn("rounded-xl border bg-black/25 p-2", position === 0 ? "border-brand-magenta/40" : "border-white/10")}>
                <div className="flex items-center gap-2.5">
                  <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {pick.imageUrl ? <img src={pick.imageUrl} alt="" className="size-full object-cover" /> : null}
                  </span>
                  <button type="button" onClick={() => setExpanded(open ? null : pick.slug)} aria-expanded={open} className="min-w-0 flex-1 cursor-pointer text-left">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{pick.title}</span>
                      <ChevronDown className={cn("size-3.5 shrink-0 text-white/40 transition-transform", open && "rotate-180")} aria-hidden />
                    </span>
                    <span className="flex items-center gap-1.5 text-caption text-white/55">
                      <span className="font-semibold text-brand-pink">{pick.groupScore}% group</span>
                      <span className="flex -space-x-1.5" aria-hidden>
                        {pick.members.map((member) => (
                          <span key={member.userId} title={`${member.name}: ${member.fit}%`} className="flex size-5 items-center justify-center rounded-full border border-surface text-[9px] font-bold text-white" style={{ backgroundColor: member.avatarColor }}>
                            {member.name.slice(0, 1).toUpperCase()}
                          </span>
                        ))}
                      </span>
                      {pick.subtitle ? <span className="truncate">{pick.subtitle}</span> : null}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    {mode === "listen" && onQueue ? (
                      <button type="button" onClick={() => onQueue(pick.slug)} aria-label={`Add ${pick.title} to the queue`} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15">
                        <Plus className="size-4" aria-hidden />
                      </button>
                    ) : null}
                    {isHost ? (
                      <button type="button" onClick={() => onPlay(pick.slug)} className="cursor-pointer rounded-full bg-gradient-brand px-3 py-1.5 text-caption font-semibold text-white">
                        Play now
                      </button>
                    ) : mode === "watch" ? (
                      <button type="button" onClick={() => onSuggest(`🎬 How about ${pick.title}? (${pick.groupScore}% group match)`)} className="cursor-pointer rounded-full border border-white/20 px-3 py-1.5 text-caption text-white/85 hover:bg-white/10">
                        Suggest
                      </button>
                    ) : null}
                  </div>
                </div>
                {open ? (
                  <ul className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2">
                    {pick.members.map((member) => (
                      <li key={member.userId} className="flex items-center gap-2 text-caption">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: member.avatarColor }}>
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="w-20 shrink-0 truncate text-white/85">{member.name.split(" ")[0]}</span>
                        <span className="w-9 shrink-0 font-semibold text-white">{member.fit}%</span>
                        <span className="truncate text-white/55">{member.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-caption text-white/55">Not enough to go on yet — once people favorite or watch a few things, picks appear.</p>
      )}
      <button type="button" onClick={() => void ask()} disabled={loading} className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-caption text-white/55 hover:text-white">
        {loading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />} Refresh for who&apos;s here now
      </button>
    </section>
  );
}
