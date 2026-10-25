import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityForm } from "@/components/admin/community-form";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  adminCommunityToFormInput,
  getAdminCommunityById,
} from "@/lib/services/admin-community.service";

export const metadata: Metadata = {
  title: "Edit community — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditCommunityPage({ params }: Props) {
  await requireSuperAdmin();
  const { id } = await params;
  const row = await getAdminCommunityById(id);
  if (!row) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Edit community</h1>
      <p className="text-sm text-white/60">{row.name}</p>
      <CommunityForm
        mode="edit"
        recordId={id}
        initial={adminCommunityToFormInput(row)}
      />
    </div>
  );
}
