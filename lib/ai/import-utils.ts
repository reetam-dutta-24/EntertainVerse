import type { CatalogSource, FieldProvenance } from "@/lib/catalog-import/types";

export function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function isFilled(value: unknown) {
  return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
}

/** Tag every filled field with where it came from; `ai` never overwrites a source tag. */
export function recordProvenance<T>(provenance: FieldProvenance<T>, values: object, origin: CatalogSource | "ai") {
  for (const [key, value] of Object.entries(values)) {
    if (!isFilled(value)) continue;
    const field = key as keyof T;
    if (origin === "ai") provenance[field] ??= "ai";
    else provenance[field] = origin;
  }
  return provenance;
}

export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
