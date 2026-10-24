"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { HdImage } from "@/components/ui/hd-image";
import type { OnboardingOption, OnboardingStepConfig } from "@/lib/data/onboarding-config";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 18;

interface PickGridProps {
  step: OnboardingStepConfig;
  picked: string[];
  /** Tags from earlier answers — visual steps sort matching options first. */
  relevanceTags: string[];
  onToggle: (optionId: string) => void;
}

function isAtMax(step: OnboardingStepConfig, picked: string[], selected: boolean) {
  return step.max != null && step.max > 1 && picked.length >= step.max && !selected;
}

function SelectedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full bg-gradient-brand shadow-glow-pink-soft",
        className,
      )}
    >
      <Check className="size-3 text-white" strokeWidth={3} />
    </span>
  );
}

/** Emoji option cards for simple preference steps. */
export function ChipPickGrid({ step, picked, onToggle }: PickGridProps) {
  return (
    <div
      className={cn(
        "grid w-full gap-3 sm:gap-4",
        step.options.length <= 6
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {step.options.map((option) => {
        const selected = picked.includes(option.id);
        const atMax = isAtMax(step, picked, selected);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            aria-pressed={selected}
            disabled={atMax}
            className={cn(
              "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-card px-3 py-4 text-center transition-all duration-300 sm:py-5",
              selected
                ? "border border-brand-magenta bg-glass-magenta shadow-glow-pink-soft"
                : "border border-white/10 bg-glass-purple hover:border-white/30 hover:shadow-glow-pink-soft",
              atMax && "cursor-not-allowed opacity-40",
            )}
          >
            {selected ? <SelectedBadge className="absolute right-2.5 top-2.5" /> : null}
            <span className="text-2xl" aria-hidden>
              {option.emoji}
            </span>
            <span className="text-sm font-semibold text-white">{option.label}</span>
            {option.hint ? (
              <span className="text-caption text-muted">{option.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function useRankedOptions(options: OnboardingOption[], relevanceTags: string[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const wanted = new Set(relevanceTags);
    const matches = q
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(q) ||
            option.tags?.some((tag) => tag.includes(q)),
        )
      : options;
    // Stable sort: more shared tags first, catalog order (top-rated) breaks ties.
    return matches
      .map((option, index) => ({
        option,
        index,
        score: option.tags?.filter((tag) => wanted.has(tag)).length ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.option);
  }, [options, relevanceTags, query]);
}

function SearchAndSelected({
  query,
  onQuery,
  placeholder,
  selectedOptions,
  onToggle,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  selectedOptions: OnboardingOption[];
  onToggle: (optionId: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <label className="relative flex w-full items-center sm:mx-auto sm:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-white/20 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-muted/60 focus:border-brand-magenta focus:outline-none"
        />
      </label>
      {selectedOptions.length ? (
        <div className="flex flex-wrap justify-center gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-magenta/60 bg-glass-magenta px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-magenta/20"
              aria-label={`Remove ${option.label}`}
            >
              {option.label}
              <X className="size-3" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <button
      type="button"
      onClick={onMore}
      className="mx-auto cursor-pointer rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
    >
      Show more ({total - shown} left)
    </button>
  );
}

/** Poster grid with search — for "titles you already love". */
export function PosterPickGrid({ step, picked, relevanceTags, onToggle }: PickGridProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const ranked = useRankedOptions(step.options, relevanceTags, query);
  const visible = ranked.slice(0, limit);
  const selectedOptions = step.options.filter((option) => picked.includes(option.id));

  return (
    <div className="flex w-full flex-col gap-4">
      <SearchAndSelected
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setLimit(PAGE_SIZE);
        }}
        placeholder="Search anime, shows, movies…"
        selectedOptions={selectedOptions}
        onToggle={onToggle}
      />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No titles match “{query}”.</p>
      ) : (
        <div className="grid w-full grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {visible.map((option) => {
            const selected = picked.includes(option.id);
            const atMax = isAtMax(step, picked, selected);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                aria-pressed={selected}
                disabled={atMax}
                className={cn(
                  "group relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-xl border text-left transition-all duration-300",
                  selected
                    ? "border-brand-magenta shadow-glow-pink-soft"
                    : "border-white/10 hover:border-white/40",
                  atMax && "cursor-not-allowed opacity-40",
                )}
              >
                {option.imageUrl ? (
                  <HdImage src={option.imageUrl} alt={option.label} fill className="transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center bg-glass-purple text-3xl">
                    {option.emoji}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 pb-2 pt-8">
                  <span className="line-clamp-2 text-caption font-semibold leading-tight text-white sm:text-xs">
                    {option.label}
                  </span>
                  {option.hint ? (
                    <span className="line-clamp-1 text-caption text-white/60">{option.hint}</span>
                  ) : null}
                </span>
                {selected ? (
                  <>
                    <span className="absolute inset-0 bg-brand-magenta/20" aria-hidden />
                    <SelectedBadge className="absolute right-2 top-2" />
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <ShowMore shown={visible.length} total={ranked.length} onMore={() => setLimit((n) => n + PAGE_SIZE)} />
    </div>
  );
}

/** Round artist portraits — sorted by the music genres picked just before. */
export function ArtistPickGrid({ step, picked, relevanceTags, onToggle }: PickGridProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const ranked = useRankedOptions(step.options, relevanceTags, query);
  const visible = ranked.slice(0, limit);
  const selectedOptions = step.options.filter((option) => picked.includes(option.id));

  return (
    <div className="flex w-full flex-col gap-4">
      <SearchAndSelected
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setLimit(PAGE_SIZE);
        }}
        placeholder="Search artists…"
        selectedOptions={selectedOptions}
        onToggle={onToggle}
      />

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No artists match “{query}”.</p>
      ) : (
        <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
          {visible.map((option) => {
            const selected = picked.includes(option.id);
            const atMax = isAtMax(step, picked, selected);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                aria-pressed={selected}
                disabled={atMax}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-card px-1 py-3 text-center transition-all duration-300",
                  selected ? "bg-glass-magenta" : "hover:bg-white/5",
                  atMax && "cursor-not-allowed opacity-40",
                )}
              >
                <span
                  className={cn(
                    "relative block aspect-square w-full max-w-[96px] overflow-hidden rounded-full border-2 transition-colors",
                    selected ? "border-brand-magenta shadow-glow-pink-soft" : "border-white/15",
                  )}
                >
                  {option.imageUrl ? (
                    <HdImage src={option.imageUrl} alt={option.label} fill />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-glass-purple text-2xl">
                      {option.emoji}
                    </span>
                  )}
                  {selected ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-brand-magenta/35">
                      <Check className="size-6 text-white" strokeWidth={3} />
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-1 text-xs font-semibold text-white sm:text-sm">
                  {option.label}
                </span>
                {option.hint ? (
                  <span className="line-clamp-1 text-caption text-muted sm:text-caption">{option.hint}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <ShowMore shown={visible.length} total={ranked.length} onMore={() => setLimit((n) => n + PAGE_SIZE)} />
    </div>
  );
}
