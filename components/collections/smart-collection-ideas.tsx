"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Globe, Headphones, Lock, Sparkles, Tv, X } from "lucide-react";
import { useToast } from "@/components/feedback/feedback-provider";
import { HdImage } from "@/components/ui/hd-image";
import { getCollectionDetailPath } from "@/lib/collection-routes";
import type { SmartCollectionIdea } from "@/lib/services/smart-collections.service";
import { cn } from "@/lib/utils";

/** "AI made these for you": weekly collection ideas from behaviour — save or dismiss. */
export function SmartCollectionIdeas({ initialIdeas }: { initialIdeas: SmartCollectionIdea[] }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [visibility, setVisibility] = useState<Record<string, "PUBLIC" | "PRIVATE">>({});
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  if (!ideas.length) return null;

  async function act(idea: SmartCollectionIdea, action: "accept" | "dismiss") {
    setBusy(idea.id);
    try {
      const response = await fetch(`/api/ai/smart-collections/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "accept" ? { action, visibility: visibility[idea.id] ?? "PRIVATE" } : { action }),
      });
      const data = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      setIdeas((current) =>
        action === "dismiss"
          ? current.filter((item) => item.id !== idea.id)
          : current.map((item) => (item.id === idea.id ? { ...item, status: "ACCEPTED", collectionSlug: data.slug } : item)),
      );
      if (action === "accept") toast(`Saved “${idea.title}” to your collections.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Something went wrong.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand-magenta/25 bg-gradient-to-br from-brand-purple/20 via-surface to-surface px-4 py-4 sm:px-6 sm:py-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
          <Sparkles className="size-5 text-brand-pink" aria-hidden /> AI made these for you
        </h2>
        <p className="mt-1 text-sm text-white/65">
          Built from what you watch and play this week. Save the ones you like — nothing is created until you do.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => {
          const saved = idea.status === "ACCEPTED";
          const choice = visibility[idea.id] ?? "PRIVATE";
          return (
            <li key={idea.id} className={cn("flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4", busy === idea.id && "animate-pulse")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1 text-micro font-semibold uppercase tracking-wide text-white/50">
                    {idea.mode === "watch" ? <Tv className="size-3" aria-hidden /> : <Headphones className="size-3" aria-hidden />}
                    {idea.mode === "watch" ? "Watch collection" : "Playlist"} · {idea.items.length} items
                  </p>
                  <h3 className="truncate text-base font-bold text-white">{idea.title}</h3>
                </div>
                {!saved ? (
                  <button
                    type="button"
                    onClick={() => void act(idea, "dismiss")}
                    disabled={busy === idea.id}
                    aria-label={`Dismiss ${idea.title}`}
                    className="-m-1 cursor-pointer rounded-full p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              <div className="flex -space-x-3">
                {idea.items.slice(0, 5).map((item) => (
                  <span key={item.slug} className="size-12 shrink-0 overflow-hidden rounded-xl border-2 border-surface bg-white/10" title={item.title}>
                    {item.imageUrl ? <HdImage src={item.imageUrl} alt="" className="size-full object-cover" /> : null}
                  </span>
                ))}
                {idea.items.length > 5 ? (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-white/10 text-xs text-white/70">
                    +{idea.items.length - 5}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-caption text-white/60">{idea.items.map((item) => item.title).join(" · ")}</p>
              <p className="text-xs text-white/55">{idea.description}</p>
              {saved ? (
                <Link
                  href={idea.collectionSlug ? getCollectionDetailPath(idea.collectionSlug) : "/dashboard/collections"}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/10"
                >
                  <Check className="size-4" aria-hidden /> Saved — open collection
                </Link>
              ) : (
                <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                  <div role="radiogroup" aria-label="Visibility" className="flex shrink-0 rounded-full border border-white/10 p-0.5">
                    {(["PRIVATE", "PUBLIC"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={choice === value}
                        onClick={() => setVisibility((current) => ({ ...current, [idea.id]: value }))}
                        className={cn(
                          "flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs",
                          choice === value ? "bg-white/15 text-white" : "text-white/55 hover:text-white",
                        )}
                      >
                        {value === "PRIVATE" ? <Lock className="size-3" aria-hidden /> : <Globe className="size-3" aria-hidden />}
                        {value === "PRIVATE" ? "Private" : "Public"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void act(idea, "accept")}
                    disabled={busy === idea.id}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Save collection
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-caption text-white/40">
        Learned from your activity —{" "}
        <Link href="/dashboard/settings/ai" className="text-brand-pink hover:underline">
          see or switch off what the AI uses
        </Link>
        .
      </p>
    </section>
  );
}
