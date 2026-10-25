import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MusicForm } from "@/components/admin/music-form";
import { adminAiSettings } from "@/lib/ai/settings";
import { requireMusicAdmin } from "@/lib/auth-guards";
import { getTrackRecordById, trackRecordToFormInput, trackRecordToLinkedSelections } from "@/lib/services/music.service";

export const metadata: Metadata = {
  title: "Edit track — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditMusicPage({ params }: Props) {
  await requireMusicAdmin();
  const { id } = await params;
  const row = await getTrackRecordById(id);
  if (!row) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Edit track</h1>
      <p className="text-sm text-white/60">{row.title}</p>
      <MusicForm
        mode="edit"
        recordId={id}
        initial={trackRecordToFormInput(row)}
        initialLinked={trackRecordToLinkedSelections(row)}
        ai={adminAiSettings()}
      />
    </div>
  );
}
