"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminCatalogPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

function pageHref(pathname: string, searchParams: URLSearchParams, nextPage: number) {
  const params = new URLSearchParams(searchParams.toString());
  if (nextPage <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(nextPage));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Server-driven pagination for admin catalog list pages (`?page=`). */
export function AdminCatalogPagination({
  page,
  totalPages,
  total,
  pageSize,
}: AdminCatalogPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const prevHref = pageHref(pathname, searchParams, page - 1);
  const nextHref = pageHref(pathname, searchParams, page + 1);

  const linkClass =
    "inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-brand-magenta/40 hover:bg-white/10";
  const disabledClass =
    "inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
      <p className="text-white/60">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={prevHref} className={linkClass} scroll={false}>
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </span>
        )}
        <span className="text-xs font-medium text-white/75">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={nextHref} className={cn(linkClass)} scroll={false}>
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </div>
  );
}
