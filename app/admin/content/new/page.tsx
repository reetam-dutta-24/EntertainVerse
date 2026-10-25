import type { Metadata } from "next";
import { ContentForm } from "@/components/admin/content-form";
import { requireContentAdmin } from "@/lib/auth-guards";
import { adminAiSettings } from "@/lib/ai/settings";
import type { ContentFormInput } from "@/lib/validators/admin/content";

export const metadata: Metadata = {
  title: "New content — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

const emptyForm: ContentFormInput = {
  title: "",
  nativeTitle: "",
  slug: "",
  type: "anime",
  description: "",
  synopsis: "",
  imageUrl: "",
  backdropUrl: "",
  meta: "",
  trendingLabel: "",
  creditLabel: "",
  highlightTags: [],
  studio: "",
  director: "",
  originalAuthor: "",
  sourceMaterial: "",
  producers: "",
  network: "",
  country: "",
  composer: "",
  status: "",
  ageRating: "",
  airedFrom: "",
  airedTo: "",
  broadcast: "",
  episodeDuration: "",
  airingDay: "",
  seasonLabel: "",
  lastUpdate: "",
  languages: [],
  genreLabels: [],
  seasons: [],
  episodes: [],
  characters: [],
  featuredTrackSlugs: [],
  relatedContentSlugs: [],
  catalogReviews: [],
};

export default async function AdminNewContentPage() {
  await requireContentAdmin();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New content</h1>
        <p className="mt-1 text-sm text-white/60">
          Import a title with AI or fill the form by hand. It appears on public
          detail pages once saved.
        </p>
      </div>
      <ContentForm
        mode="create"
        initial={emptyForm}
        ai={adminAiSettings()}
      />
    </div>
  );
}
