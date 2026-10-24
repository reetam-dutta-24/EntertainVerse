"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useNotifications } from "@/components/notifications/use-notifications";
import { cn } from "@/lib/utils";

export interface NotificationBellProps {
  className?: string;
}

/** Topbar bell with unread badge — toggles the notification dropdown panel. */
export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications — ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative cursor-pointer rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 hover:text-brand-pink",
          open && "bg-white/10 text-brand-pink",
        )}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-magenta px-1 text-micro font-bold leading-none text-white">
            +{unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(340px,calc(100vw-32px))]">
          <NotificationPanel
            notifications={notifications}
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
