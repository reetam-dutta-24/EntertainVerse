import type { ChipKey } from "@/lib/chip-styles";
import { resolveGenreChip, resolveTypeChip } from "@/lib/chip-styles";
import {
  normalizeOnboardingSelection,
  onboardingOption,
  type OnboardingSelection,
} from "@/lib/data/onboarding-config";
import type { MediaType } from "@/types";

export interface ActiveTasteFilter {
  id: string;
  label: string;
  chipKey: ChipKey;
}

function contentTypeChipKey(id: string): ChipKey {
  const mediaTypes: MediaType[] = [
    "anime",
    "show",
    "movie",
    "documentary",
    "kdrama",
  ];
  if (mediaTypes.includes(id as MediaType)) {
    return resolveTypeChip(id as MediaType);
  }
  return resolveGenreChip(id);
}

/** Map saved onboarding selections to taste chips for the dashboard bar. */
export function selectionsToActiveTasteFilters(
  selection: OnboardingSelection,
  tasteScore?: number | null,
): ActiveTasteFilter[] {
  const filters: ActiveTasteFilter[] = [];

  for (const id of selection.contentTypes) {
    const label = onboardingOption("contentTypes", id)?.label;
    if (!label) continue;
    filters.push({
      id,
      label,
      chipKey: contentTypeChipKey(id),
    });
  }

  for (const id of selection.genres) {
    const label = onboardingOption("genres", id)?.label;
    if (!label) continue;
    filters.push({
      id,
      label,
      chipKey: resolveGenreChip(id, label),
    });
  }

  for (const id of selection.musicTastes) {
    const label = onboardingOption("musicTastes", id)?.label;
    if (!label) continue;
    filters.push({
      id: `music-${id}`,
      label,
      chipKey: resolveGenreChip(id, label),
    });
  }

  if (tasteScore != null && tasteScore > 0) {
    filters.push({
      id: "match",
      label: `${Math.round(tasteScore)}%`,
      chipKey: "aimatch",
    });
  }

  return filters;
}

export function tasteProfileToActiveFilters(
  selections: unknown,
  tasteScore?: number | null,
): ActiveTasteFilter[] {
  if (!selections || typeof selections !== "object") return [];
  return selectionsToActiveTasteFilters(
    normalizeOnboardingSelection(selections),
    tasteScore,
  );
}
