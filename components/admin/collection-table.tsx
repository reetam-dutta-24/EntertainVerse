"use client";

import Link from "next/link";
import { Pencil, Plus, SearchX } from "lucide-react";
import { AdminDeleteAction } from "@/components/admin/admin-delete-action";
import { getCollectionDetailPath } from "@/lib/collection-routes";
import { EmptyState } from "@/components/ui/empty-state";

export interface AdminCollectionRow {
  recordId: string;
  slug: string;
  name: string;
  kind: string;
  visibility: string;
  itemCount: number;
  favoriteCount: number;
  ownerName: string;
}

export function AdminCollectionTable({
  rows,
  searchQuery,
}: {
  rows: AdminCollectionRow[];
  searchQuery?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={searchQuery ? <SearchX /> : <Plus />}
        description={searchQuery ? `No collections match “${searchQuery}”.` : "No collections yet. Create your first global collection."}
        action={searchQuery ? undefined : { href: "/admin/collections/new", label: "Create collection" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Kind</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium">Favts</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Visibility</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.recordId} className="border-t border-white/8 hover:bg-white/5">
              <td className="px-4 py-3 font-medium text-white">{row.name}</td>
              <td className="px-4 py-3 capitalize text-white/70">{row.kind}</td>
              <td className="px-4 py-3 text-white/70">{row.itemCount}</td>
              <td className="px-4 py-3 text-white/70">{row.favoriteCount}</td>
              <td className="px-4 py-3 text-white/70">{row.ownerName}</td>
              <td className="px-4 py-3 capitalize text-white/70">{row.visibility}</td>
              <td className="px-4 py-3 font-mono text-xs text-white/55">{row.slug}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={getCollectionDetailPath(row.slug)}
                    className="rounded-lg px-2 py-1 text-xs text-brand-pink hover:bg-white/10"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/collections/${row.recordId}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  <AdminDeleteAction
                    itemLabel={row.name}
                    deleteUrl={`/api/admin/collections/${row.recordId}`}
                    entityName="collection"
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
