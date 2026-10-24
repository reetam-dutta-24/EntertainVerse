import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import { requireContentAdmin } from "@/lib/auth-guards";
import { activeProvider, PROVIDER_LABELS } from "@/lib/ai/provider";
import { isTmdbConfigured } from "@/lib/catalog-import/sources/tmdb";
import { contentRecordToFormInput, getContentRecordById } from "@/lib/services/content.service";

export const metadata: Metadata = {
  title: "Edit content — Admin — AniVerse",
  robots: { index: false, follow: false },
};

interface EditContentPageProps {
  params: Promise<{ id: string }>;
}

function aiSettings() {
  const provider = activeProvider();
  return {
    enabled: provider !== null,
    tmdbEnabled: isTmdbConfigured(),
    providerLabel: provider ? PROVIDER_LABELS[provider] : undefined,
  };
}

export default async function AdminEditContentPage({ params }: EditContentPageProps) {
  await requireContentAdmin();
  const { id } = await params;
  const row = await getContentRecordById(id);
  if (!row) notFound();

  const initial = contentRecordToFormInput(row);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edit content</h1>
        <p className="mt-1 text-sm text-white/60">{row.title}</p>
      </div>
      <ContentForm
        mode="edit"
        contentId={id}
        initial={initial}
        ai={aiSettings()}
      />
    </div>
  );
}
