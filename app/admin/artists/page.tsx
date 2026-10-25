import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminArtistTable } from "@/components/admin/artist-table";
import { AdminCatalogSearchBar } from "@/components/admin/admin-catalog-search-bar";
import { requireArtistAdmin } from "@/lib/auth-guards";
import { listCatalogArtists } from "@/lib/services/artist.service";

export const metadata: Metadata = {
  title: "Artists — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface AdminArtistsPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminArtistsPage({ searchParams }: AdminArtistsPageProps) {
  await requireArtistAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;

  const result = await listCatalogArtists({ search, page, pageSize: 50 });

  const rows = result.items.map((item) => ({
    recordId: item.recordId,
    slug: item.slug,
    title: item.title,
    isGroup: item.isGroup,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Artist catalog</h1>
          <p className="mt-1 text-sm text-white/60">
            {search
              ? `${result.total} match${result.total === 1 ? "" : "es"} for “${search}”`
              : `${result.total} artists`}
          </p>
        </div>
        <Link
          href="/admin/artists/new"
          className="rounded-full border border-brand-magenta/40 bg-brand-magenta/10 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-magenta/20"
        >
          + New artist
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminCatalogSearchBar
          defaultQuery={search ?? ""}
          placeholder="Search artist names and slugs…"
        />
      </Suspense>

      <AdminArtistTable rows={rows} searchQuery={search} />
    </div>
  );
}
