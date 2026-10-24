"use client";

import { useEffect, useRef, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clapperboard,
  Sparkles,
} from "lucide-react";
import { ArtistCard } from "@/components/cards/artist-card";
import { CollectionCard } from "@/components/cards/collection-card";
import { CommunityCard } from "@/components/cards/community-card";
import { MusicCard } from "@/components/cards/music-card";
import { PosterCard } from "@/components/cards/poster-card";
import { GoalLinksRow } from "@/components/onboarding/goal-links-row";
import {
  ArtistPickGrid,
  ChipPickGrid,
  PosterPickGrid,
} from "@/components/onboarding/onboarding-pick-grid";
import { OnboardingProfileStep } from "@/components/onboarding/onboarding-profile-step";
import { TasteBreakdownPanel } from "@/components/onboarding/taste-breakdown-panel";
import { Chip } from "@/components/ui/chip";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  MOOD_GENRES,
  SECTION_LABELS,
  emptyOnboardingSelection,
  normalizeOnboardingSelection,
  type OnboardingRecommendations,
  type OnboardingSelection,
  type OnboardingStepConfig,
} from "@/lib/data/onboarding-config";
import {
  clearLegacyOnboardingProfile,
  getOnboardingProfileWithLegacyMigration,
  saveOnboardingProfile,
  type SavedOnboardingProfile,
} from "@/lib/onboarding-store";
import { sectionTintSeed } from "@/lib/card-theme";
import { cn } from "@/lib/utils";

type Phase = "intro" | "profile" | "quiz" | "building" | "results";

const buildingSteps = [
  "Weighing your genres & moods…",
  "Learning from your favorite titles…",
  "Matching songs, OSTs & languages…",
  "Ranking artists for your sound…",
  "Finding communities & collections…",
  "Building your taste profile…",
];

/** Drop saved picks that no longer exist in the catalog (e.g. removed titles). */
function sanitizeSelection(
  selection: OnboardingSelection,
  steps: OnboardingStepConfig[],
): OnboardingSelection {
  const next = { ...emptyOnboardingSelection };
  for (const step of steps) {
    const valid = new Set(step.options.map((option) => option.id));
    const kept = selection[step.id].filter((id) => valid.has(id));
    next[step.id] = step.max ? kept.slice(0, step.max) : kept;
  }
  return next;
}

/** Earlier answers that visual steps use to float the best matches to the top. */
function relevanceTagsFor(step: OnboardingStepConfig, selection: OnboardingSelection) {
  if (step.kind === "posters") {
    return [
      ...selection.contentTypes,
      ...selection.genres,
      ...selection.moods.flatMap((mood) => MOOD_GENRES[mood] ?? []),
      ...selection.languages,
    ];
  }
  if (step.kind === "artists") {
    return [...selection.musicTastes, ...selection.languages];
  }
  return [];
}

function CardRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-3">
      <h3 className="px-2 text-base font-bold text-white sm:text-lg">{title}</h3>
      <div className="flex flex-nowrap items-start gap-3 overflow-x-auto px-2 py-1 sm:gap-5">
        {children}
      </div>
    </section>
  );
}

/** Post-signup taste test — picks preferences, then previews the matched universe. */
export function OnboardingFlow({
  userId,
  userName,
  isRetake: retakeMode = false,
  steps,
}: {
  userId: string;
  userName: string;
  isRetake?: boolean;
  /** Catalog-backed taste-test steps, built on the server. */
  steps: OnboardingStepConfig[];
}) {
  const router = useAppRouter();
  const { update } = useSession();
  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<OnboardingSelection>(
    emptyOnboardingSelection,
  );
  const [phase, setPhase] = useState<Phase>(retakeMode ? "intro" : "profile");
  const [isRetake, setIsRetake] = useState(retakeMode);
  const [buildingStep, setBuildingStep] = useState(0);
  const [recommendations, setRecommendations] =
    useState<OnboardingRecommendations | null>(null);
  const [buildError, setBuildError] = useState<string>();

  // Retake loading reads steps once — a server refresh must not reset picks.
  const stepsRef = useRef(steps);
  const step = steps[stepIndex];
  const picked = selection[step?.id ?? "contentTypes"] ?? [];
  const minPicks = step ? Math.min(step.min, step.options.length) : 1;
  const isOptional = minPicks === 0;
  const canContinue = isOptional || picked.length >= minPicks;
  const isLastStep = stepIndex === steps.length - 1;
  const tintSeed = sectionTintSeed("onboarding-recommendations");

  async function markOnboardingComplete(
    recommendations?: OnboardingRecommendations,
  ) {
    const body = recommendations
      ? {
          tasteScore: recommendations.tasteScore,
          selection,
          summaryChips: recommendations.summaryChips,
          tasteBreakdown: recommendations.tasteBreakdown,
          goalLinks: recommendations.goalLinks,
        }
      : {};

    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function goToDashboard(recommendations?: OnboardingRecommendations) {
    await markOnboardingComplete(recommendations);
    await update({ onboardingCompleted: true });
    router.push("/dashboard");
    router.refresh();
  }

  function toggleOption(optionId: string) {
    if (!step) return;
    setSelection((current) => {
      const list = current[step.id];
      if (list.includes(optionId)) {
        return {
          ...current,
          [step.id]: list.filter((id) => id !== optionId),
        };
      }
      if (step.max === 1) {
        return { ...current, [step.id]: [optionId] };
      }
      if (step.max && list.length >= step.max) return current;
      return { ...current, [step.id]: [...list, optionId] };
    });
  }

  function handleContinue() {
    if (phase === "intro") {
      setPhase(isRetake ? "quiz" : "profile");
      return;
    }
    if (!canContinue) return;
    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }
    setPhase("building");
    setBuildingStep(0);
    setBuildError(undefined);
  }

  useEffect(() => {
    clearLegacyOnboardingProfile();

    // First-time setup starts empty on the profile step (initial state).
    if (!retakeMode) return;

    let cancelled = false;

    async function loadRetakeProfile() {
      try {
        const response = await fetch("/api/onboarding/profile");
        if (response.ok) {
          const data = (await response.json()) as {
            profile: SavedOnboardingProfile | null;
          };
          if (!cancelled && data.profile?.selection) {
            setIsRetake(true);
            setSelection(sanitizeSelection(normalizeOnboardingSelection(data.profile.selection), stepsRef.current));
            setPhase("intro");
            return;
          }
        }
      } catch {
        // Fall back to per-user local cache below.
      }

      const saved = getOnboardingProfileWithLegacyMigration(userId);
      if (!cancelled && saved?.selection) {
        setIsRetake(true);
        setSelection(sanitizeSelection(normalizeOnboardingSelection(saved.selection), stepsRef.current));
        setPhase("intro");
      }
    }

    void loadRetakeProfile();

    return () => {
      cancelled = true;
    };
  }, [retakeMode, userId]);

  useEffect(() => {
    if (phase === "quiz") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, stepIndex]);

  useEffect(() => {
    if (phase !== "building") return;
    let cancelled = false;
    const started = Date.now();

    const stepInterval = window.setInterval(() => {
      setBuildingStep((i) => Math.min(i + 1, buildingSteps.length - 1));
    }, 380);

    async function loadRecommendations() {
      try {
        const response = await fetch("/api/onboarding/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selection }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error ?? "Could not build recommendations.");
        }
        const remaining = Math.max(0, 2200 - (Date.now() - started));
        window.setTimeout(() => {
          if (cancelled) return;
          setRecommendations(data.recommendations);
          saveOnboardingProfile(userId, selection, data.recommendations);
          setPhase("results");
        }, remaining);
      } catch (error) {
        if (cancelled) return;
        setBuildError(
          error instanceof Error ? error.message : "Could not build recommendations.",
        );
        setPhase("quiz");
        setStepIndex(steps.length - 1);
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
      window.clearInterval(stepInterval);
    };
  }, [phase, selection, userId, steps.length]);

  if (phase === "profile") {
    return (
      <OnboardingProfileStep
        userName={userName}
        onContinue={() => setPhase("quiz")}
        onSkip={() => setPhase("quiz")}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex w-full max-w-[640px] flex-col items-center gap-8 text-center">
        <div className="relative flex size-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-30 blur-xl" />
          <Sparkles className="relative size-12 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-title">
            {isRetake
              ? `Update your taste, ${userName}`
              : `Welcome to AniVerse, ${userName}`}
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-subtitle">
            {isRetake
              ? "Retake the taste test to refresh your AI matches, music picks, and community recommendations."
              : "First set up your public profile, then answer a short taste test — we'll build your personalized universe before you reach the dashboard."}
          </p>
        </div>
        <ul className="grid w-full grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {[
            { emoji: "🎯", label: "AI Matches" },
            { emoji: "🎵", label: "Music Picks" },
            { emoji: "👥", label: "Communities" },
            { emoji: "📒", label: "Collections" },
          ].map((item) => (
            <li
              key={item.label}
              className="flex flex-col items-center gap-1 rounded-card border border-white/10 bg-glass-purple px-3 py-4"
            >
              <span className="text-xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="text-xs font-semibold text-white">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        <GradientButton
          size="md"
          className="w-full max-w-[320px] rounded-full"
          onClick={handleContinue}
        >
          Start {isRetake ? "Retake" : "Setup"}
          <ArrowRight className="ms-1.5 size-4" />
        </GradientButton>
        <button
          type="button"
          onClick={() => goToDashboard()}
          className="text-xs text-muted transition-colors hover:text-brand-pink"
        >
          Skip for now — take me to the dashboard
        </button>
      </div>
    );
  }

  if (phase === "building") {
    return (
      <div className="flex min-h-[60dvh] w-full max-w-[420px] flex-col items-center justify-center gap-6 text-center">
        <div className="relative flex size-28 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-magenta/25" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-gradient-brand opacity-60 blur-md" />
          <Sparkles className="relative size-12 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-title">
            Building your universe…
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-subtitle">
            {buildingSteps[buildingStep]}
          </p>
        </div>
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3">
        {buildError ? (
          <p className="text-sm text-red-400">{buildError}</p>
        ) : null}
        <div className="flex w-full flex-col gap-2">
          {buildingSteps.map((label, i) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-left text-xs transition-colors",
                i <= buildingStep
                  ? "bg-glass-magenta text-white"
                  : "bg-white/5 text-muted/60",
              )}
            >
              {i < buildingStep ? (
                <Check className="size-3.5 shrink-0 text-brand-pink" />
              ) : (
                <span className="size-3.5 shrink-0 rounded-full border border-white/30" />
              )}
              {label}
            </div>
          ))}
        </div>
      </div>
      </div>
    );
  }

  if (phase === "results" && recommendations) {
    return (
      <div className="flex w-full max-w-[1100px] flex-col items-center gap-8 pb-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-white shadow-glow-pink-soft">
            <Sparkles className="size-4" />
            AI Taste Profile: {recommendations.tasteScore}% Match
          </span>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-title">
            Your universe is ready, {userName}
          </h1>
          <p className="max-w-[520px] text-sm text-muted sm:text-subtitle">
            Here&apos;s your personalized AniVerse — content, music, artists,
            communities, and collections matched to your taste.
          </p>
        </div>

        {recommendations.summaryChips.length > 0 ? (
          <div className="flex w-full flex-wrap justify-center gap-2 px-2">
            {recommendations.summaryChips.map((chip) => (
              <Chip key={chip} variant="indigo" className="text-xs">
                {chip}
              </Chip>
            ))}
          </div>
        ) : null}

        <TasteBreakdownPanel items={recommendations.tasteBreakdown} />

        {selection.favoriteTitles.length || selection.artists.length ? (
          <p className="px-2 text-center text-xs text-white/70 sm:text-sm">
            {[
              selection.favoriteTitles.length
                ? `❤️ ${selection.favoriteTitles.length} favorite${selection.favoriteTitles.length === 1 ? "" : "s"} will be added to your profile`
                : null,
              selection.artists.length
                ? `🎤 you'll follow ${selection.artists.length} artist${selection.artists.length === 1 ? "" : "s"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}

        <GoalLinksRow links={recommendations.goalLinks} />

        <CardRow title="📋 Your Starter Watchlist">
          {recommendations.starterWatchlist.map((item) => (
            <div key={item.id} className="relative shrink-0">
              <PosterCard item={item} tintSeed={tintSeed} />
              <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-white shadow-glow-pink-soft">
                <Clapperboard className="size-3" />
              </span>
            </div>
          ))}
        </CardRow>

        <CardRow title="🎯 Matched To Your Taste">
          {recommendations.content.map((item) => (
            <PosterCard key={item.id} item={item} tintSeed={tintSeed} />
          ))}
        </CardRow>

        {recommendations.becauseYouLoved ? (
          <CardRow title={`🎬 Because You Love ${recommendations.becauseYouLoved.anchorTitle}`}>
            {recommendations.becauseYouLoved.items.map((item) => (
              <PosterCard key={item.id} item={item} tintSeed={tintSeed} />
            ))}
          </CardRow>
        ) : null}

        <CardRow title="🎵 Songs & OSTs For You">
          {recommendations.tracks.map((track) => (
            <MusicCard key={track.id} track={track} tintSeed={tintSeed} />
          ))}
        </CardRow>

        <CardRow title="🎤 Artists For You">
          {recommendations.artists.map((artist) => (
            <ArtistCard key={artist.id} item={artist} tintSeed={tintSeed} />
          ))}
        </CardRow>

        <CardRow title="📒 Collections To Explore">
          {recommendations.collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              className="w-[190px] shrink-0"
            />
          ))}
        </CardRow>

        <CardRow title="👥 Communities You'll Love">
          {recommendations.communities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              ctaMode="join"
              className="w-[190px] shrink-0"
            />
          ))}
        </CardRow>

        <GradientButton
          size="md"
          className="mt-2 w-full max-w-[320px] rounded-full"
          onClick={() => goToDashboard(recommendations)}
        >
          Enter Your Universe
          <ArrowRight className="ms-1.5 size-4" />
        </GradientButton>
      </div>
    );
  }

  if (!step) return null;

  const selectionHint =
    step.max != null && step.max > 1
      ? `${picked.length}/${step.max} selected`
      : step.max === 1 && picked.length === 1
        ? "1 selected"
        : isOptional
          ? "Optional — skip or pick"
          : null;
  const isVisualStep = step.kind !== "chips";
  const gridProps = {
    step,
    picked,
    relevanceTags: relevanceTagsFor(step, selection),
    onToggle: toggleOption,
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-6 sm:gap-8",
        isVisualStep ? "max-w-[960px]" : "max-w-[760px]",
      )}
    >
      <div className="flex w-full max-w-[520px] flex-col items-center gap-2">
        <div className="flex w-full items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                i <= stepIndex ? "bg-gradient-brand" : "bg-white/15",
                i > 0 && steps[i - 1].section !== s.section && "ms-2",
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted">
          <span className="font-semibold text-brand-pink">{SECTION_LABELS[step.section]}</span>
          {" · "}Step {stepIndex + 1} of {steps.length}
          {selectionHint ? ` · ${selectionHint}` : ""}
        </p>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-white sm:text-title">
          {step.title}
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-subtitle">
          {step.subtitle}
        </p>
      </div>

      {step.kind === "posters" ? (
        <PosterPickGrid key={step.id} {...gridProps} />
      ) : step.kind === "artists" ? (
        <ArtistPickGrid key={step.id} {...gridProps} />
      ) : (
        <ChipPickGrid key={step.id} {...gridProps} />
      )}

      {step.note && picked.length > 0 ? (
        <p className="text-center text-xs text-white/60">{step.note}</p>
      ) : null}

      {buildError ? (
        <p className="w-full max-w-[420px] text-center text-sm text-red-400">
          {buildError}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 flex w-full justify-center bg-gradient-to-t from-[#0a0416] via-[#0a0416]/95 to-transparent pb-4 pt-6">
      <div className="flex w-full max-w-[420px] items-center gap-3">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i - 1)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        ) : null}
        <GradientButton
          size="md"
          disabled={!canContinue}
          onClick={handleContinue}
          className={cn("flex-1 rounded-full", !canContinue && "opacity-50")}
        >
          {isLastStep
            ? "Build My Universe"
            : isOptional && picked.length === 0
              ? "Skip"
              : "Continue"}
          <ArrowRight className="ms-1.5 size-4" />
        </GradientButton>
      </div>
      </div>

      <button
        type="button"
        onClick={() => goToDashboard()}
        className="text-xs text-muted transition-colors hover:text-brand-pink"
      >
        Skip for now — take me to the dashboard
      </button>
    </div>
  );
}
