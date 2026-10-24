"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import type { PlatformRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getVisibleAdminNavItems } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export function AdminShell({
  role,
  children,
}: {
  role: PlatformRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getVisibleAdminNavItems(role);

  return (
    <div className="flex min-h-dvh bg-night text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-popover-deep px-4 py-6">
        <div className="flex items-center gap-2 px-2">
          <Shield className="size-5 text-brand-pink" />
          <div>
            <p className="text-sm font-semibold">AniVerse Admin</p>
            <p className="text-caption text-white/50">Catalog CMS</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-white/45">
            Platform administration
          </p>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
