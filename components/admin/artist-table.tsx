"use client";

import Link from "next/link";
import { Pencil, Plus, SearchX } from "lucide-react";
import { AdminDeleteAction } from "@/components/admin/admin-delete-action";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { EmptyState } from "@/components/ui/empty-state";

export interface AdminArtistRow {
  recordId: string;
  slug: string;
  title: string;
  isGroup: boolean;
}

export function AdminArtistTable({
  rows,
  searchQuery,
}: {
  rows: AdminArtistRow[];
  searchQuery?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={searchQuery ? <SearchX /> : <Plus />}
        description={searchQuery ? `No artists match “${searchQuery}”. Try a different name or slug.` : "No artists yet. Create your first artist profile."}
        action={searchQuery ? undefined : { href: "/admin/artists/new", label: "Create artist" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.recordId} className="border-t border-white/8 hover:bg-white/5">
              <td className="px-4 py-3 font-medium text-white">{row.title}</td>
              <td className="px-4 py-3 text-white/70">{row.isGroup ? "Group" : "Solo"}</td>
              <td className="px-4 py-3 font-mono text-xs text-white/55">{row.slug}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link href={getArtistDetailPath(row.slug)} className="rounded-lg px-2 py-1 text-xs text-brand-pink hover:bg-white/10">View</Link>
                  <Link href={`/admin/artists/${row.recordId}/edit`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:bg-white/10">
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  <AdminDeleteAction
                    itemLabel={row.title}
                    deleteUrl={`/api/admin/artists/${row.recordId}`}
                    entityName="artist"
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
