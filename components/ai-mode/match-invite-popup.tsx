"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, Sparkles, Users, X } from "lucide-react";
import { Avatar } from "@/components/ai-mode/match-experience";
import { useToast } from "@/components/feedback/feedback-provider";
import { useAppRouter } from "@/hooks/use-app-router";
import { getCommunityDashboardPath } from "@/lib/community-routes";
import type { RoomInvite, RoomView } from "@/lib/match/types";

const POLL_MS = 30_000;

/**
 * App-wide popup for AI Match room invites: checks every 30s (and when the tab comes
 * back) and pops each new invite once. "Not now" keeps it in notifications and on the
 * AI Match page.
 */
export function MatchInvitePopup() {
  const router = useAppRouter();
  const toast = useToast();
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [joining, setJoining] = useState(false);

  const check = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/api/match/invites?unseen=1");
      if (!response.ok) return;
      const data = (await response.json()) as { invites?: RoomInvite[] };
      const next = data.invites?.[0];
      if (next) setInvite((current) => current ?? next);
    } catch {
      // Offline — try again next round.
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void check(), 4_000);
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  async function act(action: "join" | "seen") {
    if (!invite) return;
    const roomId = invite.roomId;
    if (action === "join") setJoining(true);
    try {
      const response = await fetch(`/api/match/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { rooms?: RoomView[]; error?: string };
      if (action === "join") {
        if (!response.ok) throw new Error(data.error ?? "Couldn't join.");
        const room = data.rooms?.find((entry) => entry.id === roomId);
        toast(`You're in “${invite.title}”!`, "success");
        if (room?.communitySlug) router.push(getCommunityDashboardPath(room.communitySlug, "chat"));
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't join.", "error");
    } finally {
      setJoining(false);
      setInvite(null);
      // Mark seen either way so it doesn't pop again; then look for the next one.
      if (action === "join") void fetch(`/api/match/rooms/${roomId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seen" }) });
      window.setTimeout(() => void check(), 1_500);
    }
  }

  return (
    <AnimatePresence>
      {invite ? (
        <motion.div
          key={invite.roomId}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="match-invite-title"
          className="fixed inset-0 z-[420] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative flex w-full max-w-md flex-col gap-4 rounded-3xl border border-brand-magenta/40 bg-gradient-to-br from-brand-purple/40 via-surface to-surface p-5 shadow-glow-pink sm:p-6"
          >
            <button type="button" onClick={() => void act("seen")} aria-label="Not now" className="absolute right-3 top-3 cursor-pointer rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
              <X className="size-4" aria-hidden />
            </button>
            <div className="flex items-center gap-3">
              <Avatar name={invite.creatorName} color={invite.creatorAvatarColor} url={invite.creatorAvatarUrl} size="size-12" />
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-brand px-2.5 py-1 text-micro font-bold text-white">
                <Sparkles className="size-3" aria-hidden /> {invite.matchScore}% MATCH
              </span>
            </div>
            <div>
              <h2 id="match-invite-title" className="text-lg font-bold leading-snug text-white">
                {invite.headline}
              </h2>
              <p className="mt-1 text-sm text-brand-pink">{invite.vibe}</p>
              {invite.topic ? <p className="mt-1 text-sm text-white/75">“{invite.topic}”</p> : null}
              <p className="mt-2 text-xs text-white/60">Why you: {invite.reason}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-white/55">
              <Users className="size-3.5" aria-hidden /> {invite.joinedCount}/{invite.capacity} spots taken — first come, first in
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                autoFocus
                onClick={() => void act("join")}
                disabled={joining}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {joining ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null} Yes, let me in!
              </button>
              <button type="button" onClick={() => void act("seen")} className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 hover:bg-white/10">
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
