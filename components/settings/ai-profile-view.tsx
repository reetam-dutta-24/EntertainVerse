"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Sparkles, Trash2, X } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useConfirm, useToast } from "@/components/feedback/feedback-provider";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { labelForLanguage, labelForSongGenre } from "@/lib/catalog-enums";
import { VOCAB, type VocabOption } from "@/lib/ai-profile/vocabulary";
import { hasListenPrefs, hasWatchPrefs, type ListenPrefs, type WatchPrefs } from "@/lib/ai-profile/schema";
import type { AiProfile, AiProfileInsights, TraitScore } from "@/lib/services/ai-profile.service";
import { cn } from "@/lib/utils";

export interface AiProfileViewProps {
  initialProfile: AiProfile;
  insights: AiProfileInsights;
}

type Chip = { key: string; label: string; remove: () => void };

/** Drop the falsy entries left by `value && {...}`. */
const compact = (items: (Chip | false | "" | 0 | null | undefined)[]): Chip[] => items.filter((item): item is Chip => Boolean(item));

function ChipGroup({ title, chips }: { title: string; chips: Chip[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-3 pr-1 text-sm text-white">
              {chip.label}
              <button
                type="button"
                onClick={chip.remove}
                aria-label={`Remove ${chip.label}`}
                className="flex size-6 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TraitBars({ title, traits }: { title: string; traits: TraitScore[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      {traits.length ? (
        <ul className="flex flex-col gap-2.5">
          {traits.map((trait) => (
            <li key={trait.id} className="flex flex-col gap-1">
              <span className="flex items-center justify-between gap-2 text-sm text-white/85">
                <span className="truncate">
                  {trait.emoji} {trait.label}
                </span>
                <span className="shrink-0 text-xs text-muted">{trait.score}%</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-brand" style={{ width: `${trait.score}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">Not enough to go on yet — favorite, watch or answer AI mode to fill this in.</p>
      )}
    </div>
  );
}

function LinkList({ title, items, empty }: { title: string; items: { href: string; label: string }[]; empty: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.href} className="min-w-0">
              <Link href={item.href} className="block truncate text-sm text-white/85 hover:text-brand-pink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{empty}</p>
      )}
    </div>
  );
}

const vocabLabel = (map: Map<string, VocabOption>, id: string) => {
  const option = map.get(id);
  return option ? `${option.emoji} ${option.label}` : id;
};

/** Settings → AI profile: what the recommender knows, and the controls over it. */
export function AiProfileView({ initialProfile, insights }: AiProfileViewProps) {
  const router = useAppRouter();
  const confirmAction = useConfirm();
  const toast = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);

  async function send(method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    try {
      const response = await fetch("/api/ai/profile", {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json()) as { profile?: AiProfile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error ?? "Couldn't save.");
      setProfile(data.profile);
      router.refresh();
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Couldn't save.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const saveWatch = (watch: WatchPrefs) => void send("PATCH", { watch });
  const saveListen = (listen: ListenPrefs) => void send("PATCH", { listen });

  async function wipe() {
    const confirmed = await confirmAction({
      title: "Wipe what the AI knows?",
      description:
        "Your AI-mode answers, the learning setting and unsaved AI collection ideas are deleted; recommendations start fresh from your favorites. Your watch history, favorites, collections and roadmaps are kept.",
      confirmLabel: "Wipe AI profile",
      destructive: true,
    });
    if (confirmed && (await send("DELETE"))) toast("AI profile wiped.", "success");
  }

  const { watch, listen } = profile;
  const without = <T,>(list: T[], value: T) => list.filter((item) => item !== value);
  const listChips = <K extends keyof WatchPrefs>(key: K, map: Map<string, VocabOption>): Chip[] =>
    (watch[key] as string[]).map((id) => ({
      key: `${key}-${id}`,
      label: vocabLabel(map, id),
      remove: () => saveWatch({ ...watch, [key]: without(watch[key] as string[], id) }),
    }));

  const watchChips: { title: string; chips: Chip[] }[] = [
    { title: "Vibes", chips: listChips("vibes", VOCAB.vibes) },
    { title: "Themes", chips: listChips("themes", VOCAB.themes) },
    { title: "Worlds", chips: listChips("worlds", VOCAB.worlds) },
    { title: "Main characters", chips: listChips("protagonists", VOCAB.protagonists) },
    { title: "When you watch", chips: listChips("occasions", VOCAB.occasions) },
    { title: "Avoid", chips: listChips("avoid", VOCAB.avoid) },
    { title: "Formats", chips: listChips("formats", VOCAB.formats) },
    {
      title: "Languages",
      chips: watch.languages.map((id) => ({
        key: `lang-${id}`,
        label: labelForLanguage(id),
        remove: () => saveWatch({ ...watch, languages: without(watch.languages, id) }),
      })),
    },
    {
      title: "Style",
      chips: compact([
        watch.pace && { key: "pace", label: vocabLabel(VOCAB.pace, watch.pace), remove: () => saveWatch({ ...watch, pace: "" }) },
        watch.commitment && {
          key: "commitment",
          label: vocabLabel(VOCAB.commitment, watch.commitment),
          remove: () => saveWatch({ ...watch, commitment: "" }),
        },
        watch.weeklyHours && {
          key: "hours",
          label: `⏱️ ${watch.weeklyHours} h / week`,
          remove: () => saveWatch({ ...watch, weeklyHours: null }),
        },
        watch.archetype && {
          key: "archetype",
          label: vocabLabel(VOCAB.archetypes, watch.archetype),
          remove: () => saveWatch({ ...watch, archetype: "" }),
        },
        watch.ending && { key: "ending", label: vocabLabel(VOCAB.ending, watch.ending), remove: () => saveWatch({ ...watch, ending: "" }) },
        watch.intensity && {
          key: "intensity",
          label: vocabLabel(VOCAB.intensity, watch.intensity),
          remove: () => saveWatch({ ...watch, intensity: "" }),
        },
        watch.company && { key: "company", label: vocabLabel(VOCAB.company, watch.company), remove: () => saveWatch({ ...watch, company: "" }) },
        watch.subsDubs && {
          key: "subsDubs",
          label: vocabLabel(VOCAB.subsDubs, watch.subsDubs),
          remove: () => saveWatch({ ...watch, subsDubs: "" }),
        },
        ]),
    },
    {
      title: "Titles you loved",
      chips: watch.lovedTitles.map((slug) => ({
        key: `loved-${slug}`,
        label: `❤️ ${slug.replace(/-/g, " ")}`,
        remove: () => saveWatch({ ...watch, lovedTitles: without(watch.lovedTitles, slug) }),
      })),
    },
    {
      title: "Things you mentioned",
      chips: watch.notes.map((note) => ({
        key: `note-${note}`,
        label: `“${note}”`,
        remove: () => saveWatch({ ...watch, notes: without(watch.notes, note) }),
      })),
    },
  ];

  const listenChips: { title: string; chips: Chip[] }[] = [
    {
      title: "Moods",
      chips: listen.moods.map((id) => ({
        key: `mood-${id}`,
        label: vocabLabel(VOCAB.listenMoods, id),
        remove: () => saveListen({ ...listen, moods: without(listen.moods, id) }),
      })),
    },
    {
      title: "Genres",
      chips: listen.genres.map((id) => ({
        key: `genre-${id}`,
        label: labelForSongGenre(id),
        remove: () => saveListen({ ...listen, genres: without(listen.genres, id) }),
      })),
    },
    {
      title: "Languages",
      chips: listen.languages.map((id) => ({
        key: `lang-${id}`,
        label: labelForLanguage(id),
        remove: () => saveListen({ ...listen, languages: without(listen.languages, id) }),
      })),
    },
    {
      title: "Style",
      chips: compact([
        listen.energy && { key: "energy", label: vocabLabel(VOCAB.energy, listen.energy), remove: () => saveListen({ ...listen, energy: "" }) },
        listen.discovery && {
          key: "discovery",
          label: vocabLabel(VOCAB.discovery, listen.discovery),
          remove: () => saveListen({ ...listen, discovery: "" }),
        },
        listen.vocals && { key: "vocals", label: vocabLabel(VOCAB.vocals, listen.vocals), remove: () => saveListen({ ...listen, vocals: "" }) },
        ]),
    },
    {
      title: "Eras",
      chips: listen.eras.map((id) => ({
        key: `era-${id}`,
        label: vocabLabel(VOCAB.era, id),
        remove: () => saveListen({ ...listen, eras: without(listen.eras, id) }),
      })),
    },
    {
      title: "Artists you love",
      chips: listen.lovedArtists.map((slug) => ({
        key: `artist-${slug}`,
        label: `❤️ ${slug.replace(/-/g, " ")}`,
        remove: () => saveListen({ ...listen, lovedArtists: without(listen.lovedArtists, slug) }),
      })),
    },
    {
      title: "Things you mentioned",
      chips: listen.notes.map((note) => ({
        key: `note-${note}`,
        label: `“${note}”`,
        remove: () => saveListen({ ...listen, notes: without(listen.notes, note) }),
      })),
    },
  ];

  const hasAnswers = hasWatchPrefs(watch) || hasListenPrefs(listen);

  return (
    <div className={cn("flex flex-col gap-5 sm:gap-6", busy && "pointer-events-none opacity-80")} aria-busy={busy}>
      <Link href="/dashboard/settings" className="inline-flex w-fit items-center gap-1.5 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="size-4" aria-hidden /> Back to settings
      </Link>

      <SettingsSection title="🎛️ Your controls" subtitle="Changes apply to your next recommendations">
        <SettingsToggle
          label="Learn from what I watch and listen to"
          description={
            profile.learnFromActivity
              ? `On — your last ${insights.historyDays} days of activity shape picks (recent counts more).`
              : "Off — picks use only your answers, favorites and follows. Your history is kept for Continue Watching."
          }
          checked={profile.learnFromActivity}
          onChange={(learnFromActivity) => void send("PATCH", { learnFromActivity })}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/api/ai/profile/export"
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            <Download className="size-4" aria-hidden /> Download my AI data
          </a>
          <button
            type="button"
            onClick={() => void wipe()}
            disabled={busy || (!profile.exists && !hasAnswers)}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-400/40 px-5 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Trash2 className="size-4" aria-hidden /> Wipe what the AI knows
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="🧬 Your taste reads as" subtitle="Where you sit among the vibes, from everything below">
        {insights.embeddingsReady ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <TraitBars title="📺 Watching" traits={insights.watchTraits} />
            <TraitBars title="🎧 Listening" traits={insights.listenTraits} />
          </div>
        ) : (
          <p className="text-sm text-muted">The taste map turns on once the catalog has been analysed by the AI model.</p>
        )}
      </SettingsSection>

      <SettingsSection
        title="📈 Learned from your activity"
        subtitle={profile.learnFromActivity ? "Favorites, follows and recent history" : "Learning is off — only favorites and follows count"}
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Top genres</p>
          <ul className="flex flex-wrap gap-2">
            {insights.topGenres.map((genre) => (
              <li key={genre.id} className="rounded-full bg-white/[0.06] px-3 py-1 text-sm text-white">
                {genre.emoji} {genre.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <LinkList
            title="Most watched lately"
            items={insights.mostWatched.map((item) => ({ href: `/content/${item.slug}`, label: item.title }))}
            empty={profile.learnFromActivity ? "Nothing watched in the last few months." : "Not used while learning is off."}
          />
          <LinkList
            title="Most played lately"
            items={insights.mostPlayed.map((item) => ({ href: `/song/${item.slug}`, label: `${item.title} · ${item.artist}` }))}
            empty={profile.learnFromActivity ? "Nothing played in the last few months." : "Not used while learning is off."}
          />
          <LinkList
            title="Artists you follow"
            items={insights.followedArtists.map((item) => ({ href: `/artist/${item.slug}`, label: item.title }))}
            empty="You don't follow any artists yet."
          />
        </div>
        <p className="text-xs text-muted">
          Plus {insights.favoritesCount} favorites, and anonymous “fans also watch” patterns from other viewers.
        </p>
      </SettingsSection>

      <SettingsSection title="💬 What you told AI mode" subtitle="Remove anything that's no longer true">
        {hasAnswers ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-white">📺 Watch mode</p>
              {hasWatchPrefs(watch) ? (
                watchChips.map((group) => <ChipGroup key={group.title} title={group.title} chips={group.chips} />)
              ) : (
                <p className="text-xs text-muted">No watch answers yet.</p>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-white">🎧 Listen mode</p>
              {hasListenPrefs(listen) ? (
                listenChips.map((group) => <ChipGroup key={group.title} title={group.title} chips={group.chips} />)
              ) : (
                <p className="text-xs text-muted">No listen answers yet.</p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="size-6" aria-hidden />}
            title="No answers yet"
            description="Take the AI taste quiz or chat with AI mode — what you say shows up here."
            action={{ label: "Open AI mode", href: "/dashboard/ai-mode" }}
            compact
          />
        )}
      </SettingsSection>
    </div>
  );
}
