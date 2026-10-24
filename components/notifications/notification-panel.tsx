import Link from "next/link";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { AppNotification } from "@/types";

export interface NotificationPanelProps {
  notifications: AppNotification[];
  /** How many notifications to preview in the dropdown. */
  previewCount?: number;
  onNavigate?: () => void;
}

/** Dropdown panel content shown from the topbar bell. */
export function NotificationPanel({
  notifications,
  previewCount = 4,
  onNavigate,
}: NotificationPanelProps) {
  const preview = notifications.slice(0, previewCount);

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-white/10 bg-background/95 shadow-[0_18px_60px_rgba(0,0,0,0.85)] backdrop-blur-md">
      <p className="px-4 pb-2 pt-4 text-center text-base font-bold text-white">
        Notifications
      </p>

      <div className="flex max-h-[min(60vh,480px)] flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {preview.length > 0 ? (
          preview.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            You&rsquo;re all caught up!
          </p>
        )}
      </div>

      <Link
        href="/dashboard/notifications"
        onClick={onNavigate}
        className="border-t border-white/10 py-3 text-center text-xs font-semibold text-brand-pink transition-colors hover:bg-white/5 hover:text-brand-magenta"
      >
        View All Notifications
      </Link>
    </div>
  );
}
