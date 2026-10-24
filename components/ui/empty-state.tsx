import { isValidElement } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

export interface EmptyStateLink {
  href: string;
  label: string;
}

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** A button/element, or `{ href, label }` for a link to the next useful action. */
  action?: React.ReactNode | EmptyStateLink;
  /** Inline variant for sections and lists (no glass panel). */
  compact?: boolean;
}

function isLinkAction(action: EmptyStateProps["action"]): action is EmptyStateLink {
  return (
    typeof action === "object" &&
    action !== null &&
    !isValidElement(action) &&
    "href" in action
  );
}

function ActionSlot({ action }: { action: EmptyStateProps["action"] }) {
  if (!action) return null;
  if (isLinkAction(action)) {
    return (
      <Link
        href={action.href}
        className="inline-flex h-10 items-center justify-center rounded-full border border-brand-magenta/70 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-magenta/15"
      >
        {action.label}
      </Link>
    );
  }
  return <>{action}</>;
}

/** Placeholder for empty lists and zero-data views — icon, one helpful line, next action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center",
          className,
        )}
        {...props}
      >
        {icon ? (
          <div className="flex size-10 items-center justify-center rounded-full bg-white/[0.06] text-brand-pink [&_svg]:size-5">
            {icon}
          </div>
        ) : null}
        {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
        {description ? (
          <p className="max-w-md text-sm text-white/65">{description}</p>
        ) : null}
        {action ? (
          <div className="mt-1">
            <ActionSlot action={action} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <GlassCard
      tint="purple"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-8 py-14 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-gradient-brand text-white [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      {title ? <h3 className="text-lg font-semibold text-white">{title}</h3> : null}
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-3">
          <ActionSlot action={action} />
        </div>
      ) : null}
    </GlassCard>
  );
}
