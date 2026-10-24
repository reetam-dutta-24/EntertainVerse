import { z } from "zod";
import { listenLinkSchema } from "@/lib/listen-links";
import {
  accentEnum,
  artistGenreEnum,
  catalogReviewInputSchema,
  languageEnum,
} from "@/lib/validators/admin/catalog-shared";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalLongString = z.string().trim().max(5000).optional().or(z.literal(""));

const memberSchema = z.object({
  name: z.string().trim().min(1, "Member name is required").max(120),
  role: optionalString,
  imageUrl: optionalString,
});

/**
 * Artist catalog metadata for the Artist Admin CMS.
 * KPI stats and AI Match % are computed from user interactions — not in POST body.
 */
export const artistFormSchema = z.object({
  title: z.string().trim().min(1, "Artist name is required").max(200),
  nativeTitle: optionalString,
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  synopsis: optionalLongString,
  imageUrl: optionalString,
  accent: accentEnum.optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  rankLeft: optionalString,
  rankRight: optionalString,
  primaryTags: z.array(z.string().trim().min(1)).default([]),
  languages: z.array(languageEnum).default([]),
  label: optionalString,
  debutYear: z.coerce.number().int().min(1900).max(2100).optional(),
  isGroup: z.boolean().default(false),
  members: z.array(memberSchema).default([]),
  genreLabels: z.array(artistGenreEnum).default([]),
  /** Artist profiles on legal streaming services. */
  listenLinks: z.array(listenLinkSchema).max(8).default([]),
  catalogReviews: z.array(catalogReviewInputSchema).default([]),
});

export type ArtistFormInput = z.infer<typeof artistFormSchema>;
