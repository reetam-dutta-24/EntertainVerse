import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminCatalogPagination } from "@/components/admin/admin-catalog-pagination";
import { AdminCatalogSearchBar } from "@/components/admin/admin-catalog-search-bar";
import { AdminMusicTable } from "@/components/admin/music-table";
import { requireMusicAdmin } from "@/lib/auth-guards";
import { listCatalogTracks } from "@/lib/services/music.service";

export const metadata: Metadata = {
  title: "Music — Admin — EntertainVerse",
  robots: { index: false, follow: false },
};

interface AdminMusicPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function AdminMusicPage({ searchParams }: AdminMusicPageProps) {
  await requireMusicAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const search = q?.trim() || undefined;

  const result = await listCatalogTracks({ search, page, pageSize: 50 });

  const rows = result.items.map(({ recordId, track }) => ({
    recordId,
    slug: track.id,
    title: track.title,
    artist: track.artist,
    kind: track.kind,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Music catalog</h1>
          <p className="mt-1 text-sm text-white/60">
            {search
              ? `${result.total} match${result.total === 1 ? "" : "es"} for “${search}”`
              : `${result.total} tracks`}
          </p>
        </div>
        <Link
          href="/admin/music/new"
          className="rounded-full border border-brand-magenta/40 bg-brand-magenta/10 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-magenta/20"
        >
          + New track
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminCatalogSearchBar
          defaultQuery={search ?? ""}
          placeholder="Search tracks, artists, slugs…"
        />
      </Suspense>

      <AdminMusicTable rows={rows} searchQuery={search} />

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
