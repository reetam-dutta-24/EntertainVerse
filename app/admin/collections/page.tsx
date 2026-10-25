import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminCatalogPagination } from "@/components/admin/admin-catalog-pagination";
import { AdminCatalogSearchBar } from "@/components/admin/admin-catalog-search-bar";
import { AdminCollectionTable } from "@/components/admin/collection-table";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { listAdminCollections } from "@/lib/services/admin-collection.service";

export const metadata: Metadata = {
  title: "Collections — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface AdminCollectionsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminCollectionsPage({
  searchParams,
}: AdminCollectionsPageProps) {
  await requireSuperAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;

  const result = await listAdminCollections({ search, page, pageSize: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Global collections</h1>
          <p className="mt-1 text-sm text-white/60">
            {search
              ? `${result.total} match${result.total === 1 ? "" : "es"} for “${search}”`
              : `${result.total} collections — public by default, with catalog items`}
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className="rounded-full border border-brand-magenta/40 bg-brand-magenta/10 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-magenta/20"
        >
          + New collection
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminCatalogSearchBar
          defaultQuery={search ?? ""}
          placeholder="Search collections by name or slug…"
        />
      </Suspense>

      <AdminCollectionTable rows={result.items} searchQuery={search} />

      <Suspense fallback={null}>
        <AdminCatalogPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
        />
      </Suspense>

      <Link href="/admin" className="text-sm text-brand-pink hover:underline">
        ← Back to admin overview
      </Link>
    </div>
  );
}
