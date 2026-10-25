import type { Metadata } from "next";
import { CommunityForm } from "@/components/admin/community-form";
import { requireSuperAdmin } from "@/lib/auth-guards";
import type { AdminCommunityFormInput } from "@/lib/validators/admin/community";

export const metadata: Metadata = {
  title: "New community — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

const emptyForm: AdminCommunityFormInput = {
  name: "",
  slug: "",
  category: "Anime",
  description: "",
  visibility: "PUBLIC",
  activityLevel: "active",
  accent: "cyan",
  imageUrl: "",
  wallpaperUrl: "",
};

export default async function AdminNewCommunityPage() {
  await requireSuperAdmin();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">New community</h1>
      <CommunityForm mode="create" initial={emptyForm} />
    </div>
  );
}
