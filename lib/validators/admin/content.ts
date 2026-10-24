import { z } from "zod";
import {
  accentEnum,
  catalogReviewInputSchema,
  contentCharacterInputSchema,
  contentEpisodeInputSchema,
  contentGenreEnum,
  contentSeasonInputSchema,
  languageEnum,
} from "@/lib/validators/admin/catalog-shared";

/** Video catalog types managed by the Content Admin CMS. */
export const contentMediaTypes = [
  "anime",
  "show",
  "movie",
  "documentary",
  "kdrama",
] as const;

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalLongString = z.string().trim().max(5000).optional().or(z.literal(""));

/**
 * Admin catalog metadata — everything shown on the public content detail page.
 * Engagement KPIs are aggregated from user interactions at read time.
 */
export const contentFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  nativeTitle: optionalString,
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  type: z.enum(contentMediaTypes),
  description: optionalLongString,
  synopsis: z.string().trim().max(10000).optional().or(z.literal("")),
  imageUrl: optionalString,
  backdropUrl: optionalString,
  rating: z.coerce.number().min(0).max(10).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  meta: z.string().trim().max(120).optional().or(z.literal("")),
  accent: z.union([accentEnum, z.literal("")]).optional(),
  trendingLabel: z.string().trim().max(200).optional().or(z.literal("")),
  creditLabel: z.string().trim().max(200).optional().or(z.literal("")),
  highlightTags: z.array(z.string().trim().min(1)).default([]),
  studio: optionalString,
  director: optionalString,
  originalAuthor: optionalString,
  sourceMaterial: optionalString,
  producers: optionalString,
  network: optionalString,
  country: optionalString,
  composer: optionalString,
  status: optionalString,
  ageRating: optionalString,
  imdbRating: z.coerce.number().min(0).max(10).optional(),
  malScore: z.coerce.number().min(0).max(10).optional(),
  airedFrom: optionalString,
  airedTo: optionalString,
  broadcast: optionalString,
  episodeDuration: optionalString,
  airingDay: optionalString,
  seasonLabel: optionalString,
  lastUpdate: optionalString,
  languages: z.array(languageEnum).default([]),
  seasonCount: z.coerce.number().int().min(0).max(500).optional(),
  episodeCount: z.coerce.number().int().min(0).max(10000).optional(),
  videoUrl: optionalString,
  /** Official trailer page (YouTube). */
  trailerUrl: optionalString,
  /** TMDB link used for live "where to watch" data. */
  tmdbId: z.coerce.number().int().positive().optional(),
  tmdbKind: z.union([z.enum(["movie", "tv"]), z.literal("")]).optional(),
  genreLabels: z.array(contentGenreEnum).default([]),
  seasons: z.array(contentSeasonInputSchema).default([]),
  episodes: z.array(contentEpisodeInputSchema).default([]),
  characters: z.array(contentCharacterInputSchema).default([]),
  featuredTrackSlugs: z.array(z.string().trim().min(1)).default([]),
  relatedContentSlugs: z.array(z.string().trim().min(1)).default([]),
  catalogReviews: z.array(catalogReviewInputSchema).default([]),
});

export type ContentFormInput = z.infer<typeof contentFormSchema>;

export const contentListQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(contentMediaTypes).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
