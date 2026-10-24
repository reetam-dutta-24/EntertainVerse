"use client";

import Link from "next/link";
import { Pencil, Plus, SearchX } from "lucide-react";
import { AdminDeleteAction } from "@/components/admin/admin-delete-action";
import { getSongDetailPath } from "@/lib/song-routes";
import { EmptyState } from "@/components/ui/empty-state";

export interface AdminMusicRow {
  recordId: string;
  slug: string;
  title: string;
  artist: string;
  kind: string;
}

export function AdminMusicTable({
  rows,
  searchQuery,
}: {
  rows: AdminMusicRow[];
  searchQuery?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={searchQuery ? <SearchX /> : <Plus />}
        description={searchQuery ? `No tracks match “${searchQuery}”. Try a different title, artist, or slug.` : "No tracks yet. Create your first song or OST."}
        action={searchQuery ? undefined : { href: "/admin/music/new", label: "Create track" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Artist</th>
            <th className="px-4 py-3 font-medium">Kind</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.recordId} className="border-t border-white/8 hover:bg-white/5">
              <td className="px-4 py-3 font-medium text-white">{row.title}</td>
              <td className="px-4 py-3 text-white/70">{row.artist}</td>
              <td className="px-4 py-3 capitalize text-white/70">{row.kind}</td>
              <td className="px-4 py-3 font-mono text-xs text-white/55">{row.slug}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link href={getSongDetailPath(row.slug)} className="rounded-lg px-2 py-1 text-xs text-brand-pink hover:bg-white/10">View</Link>
                  <Link href={`/admin/music/${row.recordId}/edit`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:bg-white/10">
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  <AdminDeleteAction
                    itemLabel={row.title}
                    deleteUrl={`/api/admin/music/${row.recordId}`}
                    entityName="track"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
