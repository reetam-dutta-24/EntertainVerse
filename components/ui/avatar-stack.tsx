import { ProfileLink } from "@/components/profile/profile-link";
import { cn } from "@/lib/utils";
import { avatarColors } from "@/lib/accents";
import type { UserSummary } from "@/types";

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  users: UserSummary[];
  /** Max avatars to render before collapsing into the trailing label. */
  max?: number;
  /** Trailing label, e.g. "+20" or "....42k+". Auto-derived when omitted. */
  overflowLabel?: string;
  size?: "sm" | "md";
  /** Each avatar opens that user's profile (default). */
  linkProfiles?: boolean;
  /** The stack sits inside another link/button — see ProfileLink. */
  nestedLinks?: boolean;
}

/** Row of colored initial circles (Figma "UserProfile Display"). */
export function AvatarStack({
  users,
  max = 3,
  overflowLabel,
  size = "md",
  linkProfiles = true,
  nestedLinks = false,
  className,
  ...props
}: AvatarStackProps) {
  const visible = users.slice(0, max);
  const hidden = users.length - visible.length;
  const label = overflowLabel ?? (hidden > 0 ? `+${hidden}` : undefined);

  return (
    <div className={cn("flex items-center gap-0.5", className)} {...props}>
      {visible.map((user, i) => (
        <ProfileLink
          key={user.id}
          handle={linkProfiles ? (user.handle ?? user.id) : undefined}
          name={user.name}
          nested={nestedLinks}
        >
          <span
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full text-center font-semibold text-black",
              size === "md" ? "size-9 text-base" : "size-7 text-xs",
            )}
            style={{
              backgroundColor:
                user.avatarColor ?? avatarColors[i % avatarColors.length],
            }}
            title={user.name}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="size-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </span>
        </ProfileLink>
      ))}
      {label ? (
        <span className="ms-1.5 text-sm font-semibold text-white">{label}</span>
      ) : null}
    </div>
  );
}
