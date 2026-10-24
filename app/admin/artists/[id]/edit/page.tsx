import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistForm } from "@/components/admin/artist-form";
import { adminAiSettings } from "@/lib/ai/settings";
import { requireArtistAdmin } from "@/lib/auth-guards";
import { artistRecordToFormInput, getArtistRecordById } from "@/lib/services/artist.service";

export const metadata: Metadata = {
  title: "Edit artist — Admin — AniVerse",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditArtistPage({ params }: Props) {
  await requireArtistAdmin();
  const { id } = await params;
  const row = await getArtistRecordById(id);
  if (!row) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Edit artist</h1>
      <p className="text-sm text-white/60">{row.title}</p>
      <ArtistForm mode="edit" recordId={id} initial={artistRecordToFormInput(row)} ai={adminAiSettings()} />
    </div>
  );
}
