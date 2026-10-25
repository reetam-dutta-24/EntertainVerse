import type { Metadata } from "next";
import { CollectionForm } from "@/components/admin/collection-form";
import { requireSuperAdmin } from "@/lib/auth-guards";
import type { AdminCollectionFormInput } from "@/lib/validators/admin/collection";

export const metadata: Metadata = {
  title: "New collection — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

const emptyForm: AdminCollectionFormInput = {
  name: "",
  slug: "",
  description: "",
  category: "Mixed",
  genreLabels: [],
  kind: "content",
  visibility: "PUBLIC",
  accent: "blue",
  imageUrl: "",
  contentSlugs: [],
  trackSlugs: [],
};

export default async function AdminNewCollectionPage() {
  await requireSuperAdmin();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">New collection</h1>
      <CollectionForm mode="create" initial={emptyForm} />
    </div>
  );
}
