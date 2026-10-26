"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Shield, X } from "lucide-react";
import type { PlatformRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getVisibleAdminNavItems } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

/** Admin CMS chrome — fixed rail from lg, slide-in drawer on phones and tablets. */
export function AdminShell({
  role,
  children,
}: {
  role: PlatformRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getVisibleAdminNavItems(role);
  const [navOpen, setNavOpen] = useState(false);

  const brand = (
    <div className="flex items-center gap-2">
      <Shield className="size-5 text-brand-pink" />
      <div>
        <p className="text-sm font-semibold">EntertainVerse Admin</p>
        <p className="text-caption text-white/50">Catalog CMS</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-night text-white">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(260px,85vw)] flex-col border-r border-white/10 bg-popover-deep px-4 py-6 transition-transform duration-300 ease-out",
          "lg:static lg:w-60 lg:shrink-0 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          {brand}
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close admin menu"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Admin" className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 px-1 pt-6">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-xs text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          >
            ← Back to app
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Close admin menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6 lg:py-4">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open admin menu"
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">{brand}</div>
          <p className="hidden text-xs uppercase tracking-wide text-white/45 lg:block">
            Platform administration
          </p>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
