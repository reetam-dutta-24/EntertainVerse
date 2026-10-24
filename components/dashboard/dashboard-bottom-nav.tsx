"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Clapperboard,
  Home,
  PlayCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Discover", href: "/dashboard/discover", icon: Search },
  { label: "For You", href: "/dashboard/for-you", icon: PlayCircle },
  { label: "Watchlist", href: "/dashboard/watchlist", icon: Clapperboard },
  { label: "Collections", href: "/dashboard/collections", icon: BookOpen },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
] as const;

/** Mobile bottom tab bar — primary dashboard routes. */
export function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-sidebar/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-caption font-medium transition-colors",
                  active
                    ? "text-brand-pink"
                    : "text-white/70 hover:text-white",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
