"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, LoaderCircle, Search, Send } from "lucide-react";
import type { PartyReaction } from "@/hooks/use-party";
import type { PartyChatMessage, PartyMember } from "@/lib/party/types";
import type { SearchResult } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { ProfileLink } from "@/components/profile/profile-link";

export const REACTIONS = ["😂", "🔥", "😭", "😱", "❤️", "👏"] as const;

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function MemberStrip({ members, hostId }: { members: PartyMember[]; hostId: string | null }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="In the party">
      {members.map((member) => (
        <li key={member.userId} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-2.5 text-caption text-white/85">
          <ProfileLink handle={member.userId} name={member.name} newTab>
            <span className="flex size-6 items-center justify-center overflow-hidden rounded-full text-micro font-bold text-white" style={{ backgroundColor: member.avatarColor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="size-full object-cover" /> : member.name.slice(0, 1).toUpperCase()}
            </span>
          </ProfileLink>
          {member.name.split(" ")[0]}
          {member.userId === hostId ? <Crown className="size-3 text-amber-300" aria-label="Host" /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Floating emoji reactions over the player. */
export function ReactionLayer({ reactions }: { reactions: PartyReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.span
            key={reaction.id}
            className="absolute bottom-6 text-3xl"
            style={{ left: `${10 + ((reaction.id * 37) % 80)}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -180, opacity: [0, 1, 1, 0], scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, ease: "easeOut" }}
          >
            {reaction.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label="React">
      {REACTIONS.map((emoji) => (
        <button key={emoji} type="button" onClick={() => onReact(emoji)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-lg transition-transform hover:scale-110 hover:bg-white/10" aria-label={`React ${emoji}`}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function PartyChat({ messages, onSend, viewerUserId }: { messages: PartyChatMessage[]; onSend: (text: string) => void; viewerUserId?: string }) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  // Block body: some browsers return a value from scrollIntoView, which React would treat as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ol className="flex min-h-[120px] flex-1 flex-col gap-1.5 overflow-y-auto pr-1" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <li key={message.id} className={cn("text-sm", message.userId === viewerUserId ? "text-white" : "text-white/85")}>
              <span className="font-semibold" style={{ color: message.avatarColor }}>
                {message.name.split(" ")[0]}
              </span>{" "}
              {message.text}
            </li>
          ))
        ) : (
          <li className="text-caption text-white/45">Party chat is live — say something.</li>
        )}
        <div ref={endRef} />
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onSend(draft.trim());
          setDraft("");
        }}
      >
        <label htmlFor="party-chat" className="sr-only">
          Message the party
        </label>
        <input id="party-chat" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={300} placeholder="Say something…" className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none" />
        <button type="submit" aria-label="Send" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-brand text-white">
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

/** Search the catalog for titles (watch) or songs (listen). */
export function MediaPicker({ type, onPick, placeholder }: { type: "content" | "song"; onPick: (slug: string, title: string) => void; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=10`);
        const data = (await response.json()) as { results?: SearchResult[] };
        setResults((data.results ?? []).filter((result) => result.type === type).slice(0, 6));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, type]);

  const shown = query.trim().length >= 2 ? results : [];
  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-white/40" aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full rounded-full border border-white/15 bg-white/5 pl-9 pr-9 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none" />
        {loading ? <LoaderCircle className="absolute right-3 size-4 animate-spin text-white/50" aria-hidden /> : null}
      </label>
      {shown.length ? (
        <ul className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-popover p-1.5">
          {shown.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(result.id, result.title);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/10"
              >
                <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {result.imageUrl ? <img src={result.imageUrl} alt="" className="size-full object-cover" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{result.title}</span>
                  {result.subtitle ? <span className="block truncate text-caption text-white/50">{result.subtitle}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
