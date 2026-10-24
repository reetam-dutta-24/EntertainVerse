import { cn } from "@/lib/utils";
import type { Member, MemberRole } from "@/types";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip, type ChipProps } from "@/components/ui/chip";

const roleChips: Record<MemberRole, { label: string; variant: ChipProps["variant"] }> = {
  owner: { label: "Owner", variant: "brand" },
  admin: { label: "Admin", variant: "magenta" },
  moderator: { label: "Mod", variant: "blue" },
  member: { label: "Member", variant: "indigo" },
};

export interface MemberRowProps extends React.HTMLAttributes<HTMLDivElement> {
  member: Member;
  /** Trailing action, e.g. a follow/message button. */
  action?: React.ReactNode;
}

/** Community member list row (Figma "Member Icon BTN", 79px tall). */
export function MemberRow({
  member,
  action,
  className,
  ...props
}: MemberRowProps) {
  const role = roleChips[member.role];

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 rounded-xl bg-glass-purple px-4 transition-colors hover:bg-glass-magenta",
        className,
      )}
      {...props}
    >
      <div className="relative">
        <AvatarStack users={[member]} />
        {member.online ? (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-online" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-semibold text-white">
          {member.name}
        </p>
        {member.joinedAt ? (
          <p className="text-xs text-muted">Joined {member.joinedAt}</p>
        ) : null}
      </div>
      <div className="ms-auto flex items-center gap-2.5">
        <Chip variant={role.variant}>{role.label}</Chip>
        {action}
      </div>
    </div>
  );
}
