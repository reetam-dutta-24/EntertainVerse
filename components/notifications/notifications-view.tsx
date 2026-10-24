"use client";

import { useEffect } from "react";
import { CheckCheck, BellOff } from "lucide-react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotifications } from "@/components/notifications/use-notifications";
import {
  hydrateNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications-store";
import type { AppNotification } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";

export interface NotificationsViewProps {
  initialNotifications?: AppNotification[];
}

/** Full notifications page — expanded cards grouped by read state. */
export function NotificationsView({
  initialNotifications = [],
}: NotificationsViewProps) {
  const notifications = useNotifications();

  useEffect(() => {
    if (initialNotifications.length > 0) {
      hydrateNotifications(initialNotifications);
    }
  }, [initialNotifications]);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 sm:gap-6">
      <section className="bg-gradient-brand rounded-2xl px-4 py-4 shadow-[0_4px_24px_rgba(255,0,204,0.2)] sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              🔔 All Notifications
            </h2>
            <p className="mt-1.5 text-sm font-normal text-white/95">
              {unread.length > 0
                ? `You have ${unread.length} unread notification${unread.length === 1 ? "" : "s"} waiting for you.`
                : "You're all caught up — nothing unread."}
            </p>
          </div>
          {unread.length > 0 ? (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead()}
              className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/60 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 sm:w-auto"
            >
              <CheckCheck className="size-4" />
              Mark All As Read
            </button>
          ) : null}
        </div>
      </section>

      {unread.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-white sm:text-lg">📬 Unread</h3>
          {unread.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              variant="full"
            />
          ))}
        </section>
      ) : null}

      {unread.length === 0 && read.length === 0 ? (
        <EmptyState
          compact
          icon={<BellOff />}
          description="No notifications yet — follows, friend requests and community activity show up here."
          action={{ href: "/dashboard/community", label: "Join a community" }}
        />
      ) : null}

      {read.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-white sm:text-lg">📭 Earlier</h3>
          {read.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              variant="full"
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
