"use client";

import Link from "next/link";
import { Pencil, Plus, SearchX } from "lucide-react";
import type { AdminContentRow } from "@/components/admin/types";
import { AdminDeleteAction } from "@/components/admin/admin-delete-action";
import { getContentDetailPath } from "@/lib/content-routes";
import { EmptyState } from "@/components/ui/empty-state";

export function AdminContentTable({
  rows,
  searchQuery,
}: {
  rows: AdminContentRow[];
  searchQuery?: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={searchQuery ? <SearchX /> : <Plus />}
        description={searchQuery ? `No content matches “${searchQuery}”. Try a different title or slug.` : "No catalog content yet. Create your first title."}
        action={searchQuery ? undefined : { href: "/admin/content/new", label: "Create title" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium">Genres</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ recordId, item }) => (
            <tr
              key={recordId}
              className="border-t border-white/8 hover:bg-white/5"
            >
              <td className="px-4 py-3 font-medium text-white">{item.title}</td>
              <td className="px-4 py-3 capitalize text-white/70">{item.type}</td>
              <td className="px-4 py-3 font-mono text-xs text-white/55">
                {item.id}
              </td>
              <td className="px-4 py-3 text-white/65">
                {item.genres.map((g) => g.label).join(", ") || "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={getContentDetailPath(item.id)}
                    className="rounded-lg px-2 py-1 text-xs text-brand-pink hover:bg-white/10"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/content/${recordId}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Link>
                  <AdminDeleteAction
                    itemLabel={item.title}
                    deleteUrl={`/api/admin/content/${recordId}`}
                    entityName="title"
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
