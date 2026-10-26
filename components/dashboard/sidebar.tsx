"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Clapperboard,
  Gift,
  Heart,
  Home,
  MessageCircle,
  PlayCircle,
  Search,
  Settings,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  UserProfileMenu,
  type DashboardUser,
} from "@/components/dashboard/user-profile-menu";
import { cn } from "@/lib/utils";
import { MessagesNavBadge } from "@/components/messages/messages-nav-badge";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Ordered by how often people reach for them: discovery first, then their library, then people. */
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Discover",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "For You", href: "/dashboard/for-you", icon: PlayCircle },
      { label: "Discover", href: "/dashboard/discover", icon: Search },
      { label: "AI Mode", href: "/dashboard/ai-mode", icon: WandSparkles },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Watchlist", href: "/dashboard/watchlist", icon: Clapperboard },
      { label: "Collections", href: "/dashboard/collections", icon: BookOpen },
      { label: "Favourites", href: "/dashboard/favorites", icon: Heart },
    ],
  },
  {
    label: "Social",
    items: [
      { label: "Community", href: "/dashboard/community", icon: Users },
      { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    ],
  },
];

/** Occasional destinations — kept small, next to the account menu. */
const secondaryItems: NavItem[] = [
  { label: "Wrapped", href: "/dashboard/wrapped", icon: Gift },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

function NavLink({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-pink/70",
        compact ? "py-1.5 text-xs text-white/55 hover:text-white/90" : "py-2 text-small text-white/75 hover:text-white",
        active && "text-white",
      )}
    >
      {active ? (
        // One shared pill that glides to whichever item is active.
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-magenta/25 via-brand-magenta/10 to-transparent ring-1 ring-inset ring-brand-magenta/40 shadow-glow-pink-soft"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden
        />
      ) : (
        <span
          className="absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/[0.06]"
          aria-hidden
        />
      )}
      <item.icon
        className={cn(
          "relative shrink-0 transition-colors",
          compact ? "size-3.5" : "size-4",
          active ? "text-brand-pink" : "text-white/55 group-hover:text-white/85",
        )}
      />
      <span className="relative min-w-0 flex-1 truncate">{item.label}</span>
      {item.href === "/dashboard/messages" ? (
        <span className="relative">
          <MessagesNavBadge />
        </span>
      ) : null}
    </Link>
  );
}

export interface DashboardSidebarProps {
  user: DashboardUser;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

/** Fixed left rail on desktop; slide-in drawer on mobile. */
export function DashboardSidebar({
  user,
  mobileOpen = false,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[min(280px,85vw)] flex-col border-r border-white/[0.06] bg-sidebar px-3 pb-4 pt-5 transition-transform duration-300 ease-out lg:w-[168px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Soft brand glow behind the logo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(216,2,220,0.16),transparent_70%)]"
        aria-hidden
      />

      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="relative px-3 text-xl font-semibold tracking-wide text-white lg:text-lg lg:tracking-normal"
      >
        EntertainVerse
      </Link>

      <nav aria-label="Main" className="relative -mx-1 mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-micro font-semibold uppercase tracking-[0.14em] text-white/60">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="relative mt-3 flex flex-col gap-0.5 border-t border-white/[0.07] pt-3">
        {secondaryItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} compact onNavigate={onNavigate} />
        ))}
      </div>

      <div className="relative mt-3 px-1">
        <UserProfileMenu
          user={user}
          placement="sidebar"
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}
