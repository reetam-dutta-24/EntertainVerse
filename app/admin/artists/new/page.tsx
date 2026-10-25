import type { Metadata } from "next";
import { ArtistForm } from "@/components/admin/artist-form";
import { adminAiSettings } from "@/lib/ai/settings";
import { requireArtistAdmin } from "@/lib/auth-guards";
import type { ArtistFormInput } from "@/lib/validators/admin/artist";

export const metadata: Metadata = {
  title: "New artist — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

const emptyForm: ArtistFormInput = {
  title: "",
  nativeTitle: "",
  slug: "",
  synopsis: "",
  imageUrl: "",
  rankLeft: "",
  rankRight: "",
  primaryTags: [],
  languages: [],
  label: "",
  isGroup: false,
  members: [],
  genreLabels: [],
  listenLinks: [],
  catalogReviews: [],
};

export default async function AdminNewArtistPage() {
  await requireArtistAdmin();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New artist</h1>
        <p className="mt-1 text-sm text-white/60">Import an artist with AI or fill the form by hand.</p>
      </div>
      <ArtistForm mode="create" initial={emptyForm} ai={adminAiSettings()} />
    </div>
  );
}
