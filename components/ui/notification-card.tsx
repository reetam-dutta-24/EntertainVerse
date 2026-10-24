import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

export interface NotificationCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  notification: AppNotification;
  icon?: React.ReactNode;
}

/** Notification box (472×134 in Figma). */
export function NotificationCard({
  notification,
  icon,
  className,
  ...props
}: NotificationCardProps) {
  return (
    <div
      className={cn(
        "relative flex w-full max-w-[472px] items-center gap-4 rounded-xl bg-glass-purple p-5 shadow-card-inner transition-colors hover:bg-glass-magenta",
        className,
      )}
      {...props}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white [&_svg]:size-5">
        {icon ?? <Bell />}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold text-white">
          {notification.title}
        </p>
        {notification.description ? (
          <p className="truncate text-xs text-muted">
            {notification.description}
          </p>
        ) : null}
        {notification.createdAt ? (
          <p className="text-xs text-muted/70">{notification.createdAt}</p>
        ) : null}
      </div>
      {!notification.read ? (
        <span className="absolute right-4 top-4 size-2.5 rounded-full bg-brand-magenta" />
      ) : null}
    </div>
  );
}
