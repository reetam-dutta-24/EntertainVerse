import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/collection-form";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  adminCollectionToFormInput,
  getAdminCollectionById,
} from "@/lib/services/admin-collection.service";

export const metadata: Metadata = {
  title: "Edit collection — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditCollectionPage({ params }: Props) {
  await requireSuperAdmin();
  const { id } = await params;
  const row = await getAdminCollectionById(id);
  if (!row) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Edit collection</h1>
      <p className="text-sm text-white/60">{row.name}</p>
      <CollectionForm
        mode="edit"
        recordId={id}
        initial={adminCollectionToFormInput(row)}
      />
    </div>
  );
}
