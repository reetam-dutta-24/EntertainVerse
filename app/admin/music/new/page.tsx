import type { Metadata } from "next";
import { MusicForm } from "@/components/admin/music-form";
import { adminAiSettings } from "@/lib/ai/settings";
import { requireMusicAdmin } from "@/lib/auth-guards";
import type { MusicFormInput } from "@/lib/validators/admin/music";

export const metadata: Metadata = {
  title: "New track — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

const emptyForm: MusicFormInput = {
  title: "",
  nativeTitle: "",
  slug: "",
  artist: "",
  artistSlug: "",
  kind: "song",
  description: "",
  lyrics: "",
  source: "",
  album: "",
  language: "",
  genreLabels: [],
  durationLabel: "",
  imageUrl: "",
  backdropUrl: "",
  audioUrl: "",
  previewUrl: "",
  listenLinks: [],
  trendingLabel: "",
  creditLabel: "",
  contentSlug: "",
  catalogReviews: [],
};

export default async function AdminNewMusicPage() {
  await requireMusicAdmin();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New track</h1>
        <p className="mt-1 text-sm text-white/60">Import a song with AI or fill the form by hand.</p>
      </div>
      <MusicForm mode="create" initial={emptyForm} ai={adminAiSettings()} />
    </div>
  );
}
