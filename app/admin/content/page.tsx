import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminCatalogPagination } from "@/components/admin/admin-catalog-pagination";
import { AdminCatalogSearchBar } from "@/components/admin/admin-catalog-search-bar";
import { AdminContentTable } from "@/components/admin/content-table";
import { requireContentAdmin } from "@/lib/auth-guards";
import { listCatalogContent } from "@/lib/services/content.service";

export const metadata: Metadata = {
  title: "Content — Admin — AniVerse",
  robots: { index: false, follow: false },
};

interface AdminContentPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminContentPage({ searchParams }: AdminContentPageProps) {
  await requireContentAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;

  const result = await listCatalogContent({
    search,
    page,
    pageSize: 50,
  });

  const rows = result.items;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Content catalog</h1>
          <p className="mt-1 text-sm text-white/60">
            {search
              ? `${result.total} match${result.total === 1 ? "" : "es"} for “${search}”`
              : `${result.total} title${result.total === 1 ? "" : "s"} in the database.`}
          </p>
        </div>
        <Link
          href="/admin/content/new"
          className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white"
        >
          + New content
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminCatalogSearchBar
          defaultQuery={search ?? ""}
          placeholder="Search titles, slugs, native names…"
        />
      </Suspense>

      <AdminContentTable rows={rows} searchQuery={search} />

      <Suspense fallback={null}>
        <AdminCatalogPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
        />
      </Suspense>
    </div>
  );
}
