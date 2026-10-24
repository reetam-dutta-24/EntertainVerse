import { z } from "zod";
import { listenLinkSchema } from "@/lib/listen-links";
import {
  accentEnum,
  catalogReviewInputSchema,
  languageEnum,
  songGenreEnum,
} from "@/lib/validators/admin/catalog-shared";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalLongString = z.string().trim().max(5000).optional().or(z.literal(""));

/**
 * Song/track catalog metadata for the Music Admin CMS.
 * Engagement KPIs and AI Match % are computed from user interactions — not in POST body.
 */
export const musicFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  nativeTitle: optionalString,
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  artist: z.string().trim().min(1, "Artist credit is required").max(200),
  artistSlug: optionalString,
  kind: z.enum(["song", "ost", "album"]).default("song"),
  description: optionalLongString,
  lyrics: optionalLongString,
  source: optionalString,
  album: optionalString,
  language: z.union([languageEnum, z.literal("")]).optional(),
  genreLabels: z.array(songGenreEnum).default([]),
  rating: z.coerce.number().min(0).max(10).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  durationLabel: z.string().trim().max(20).optional().or(z.literal("")),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  imageUrl: optionalString,
  backdropUrl: optionalString,
  audioUrl: optionalString,
  /** Official 30-second clip (Apple Music) — plays when there is no full audio file. */
  previewUrl: optionalString,
  /** Deep links to legal streaming services. */
  listenLinks: z.array(listenLinkSchema).max(8).default([]),
  accent: accentEnum.optional(),
  trendingLabel: optionalString,
  creditLabel: optionalString,
  contentSlug: optionalString,
  featuredRank: z.coerce.number().int().min(1).max(100).optional(),
  catalogReviews: z.array(catalogReviewInputSchema).default([]),
});

export type MusicFormInput = z.infer<typeof musicFormSchema>;
