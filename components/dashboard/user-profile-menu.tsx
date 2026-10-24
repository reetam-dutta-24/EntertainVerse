"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { getProfilePath } from "@/lib/profile-routes";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  name: string;
  handle: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface UserProfileMenuProps {
  user: DashboardUser;
  /** topbar = opens downward; sidebar = opens upward from bottom rail */
  placement?: "topbar" | "sidebar";
  onNavigate?: () => void;
  className?: string;
}

function UserAvatar({
  user,
  size = "md",
}: {
  user: DashboardUser;
  size?: "sm" | "md";
}) {
  const initial = user.name.charAt(0).toUpperCase();
  const dim = size === "sm" ? "size-8 text-xs" : "size-9 text-sm";

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", dim)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-black shadow-[0_0_12px_rgba(255,0,204,0.35)]",
        dim,
      )}
      style={{ backgroundColor: user.avatarColor }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

/** Colored avatar + industry-style account dropdown (profile, settings, sign out). */
export function UserProfileMenu({
  user,
  placement = "topbar",
  onNavigate,
  className,
}: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isSidebar = placement === "sidebar";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeAndNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  const menuItems = [
    {
      label: "View Profile",
      href: getProfilePath(user.handle),
      icon: User,
    },
    {
      label: "Messages",
      href: "/dashboard/messages",
      icon: MessageCircle,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    ...(user.isAdmin
      ? [
          {
            label: "Admin CMS",
            href: "/admin",
            icon: Shield,
          },
        ]
      : []),
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
    },
  ];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-xl transition-colors hover:bg-white/10",
          isSidebar ? "w-full px-1 py-1.5" : "px-1.5 py-1",
          open && "bg-white/10",
        )}
      >
        <UserAvatar user={user} size={isSidebar ? "sm" : "md"} />
        <span
          className={cn(
            "min-w-0 truncate text-left font-medium text-white",
            isSidebar ? "flex-1 text-xs" : "hidden max-w-[120px] text-sm sm:block lg:max-w-none",
          )}
        >
          {user.name}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/60 transition-transform",
            open && "rotate-180",
            isSidebar ? "" : "hidden sm:block",
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 w-[min(260px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-popover/95 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            isSidebar
              ? "bottom-[calc(100%+8px)] left-0"
              : "right-0 top-[calc(100%+10px)]",
          )}
        >
          <div className="border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.name}
                </p>
                <p className="truncate text-xs text-white/55">@{user.handle}</p>
                {user.email ? (
                  <p className="truncate text-caption text-white/45">{user.email}</p>
                ) : null}
              </div>
            </div>
          </div>

          <ul className="py-1.5">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeAndNavigate}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <item.icon className="size-4 shrink-0 text-brand-pink" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/8 py-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="size-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
