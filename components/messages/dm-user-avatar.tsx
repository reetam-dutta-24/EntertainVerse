"use client";

import { ProfileLink } from "@/components/profile/profile-link";
import { cn } from "@/lib/utils";

export interface DmUserAvatarProps {
  name: string;
  avatarColor: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Handle (or user id) — makes the avatar open that user's profile. */
  profileHandle?: string;
  /** Inside another link/button (e.g. a conversation row) — see ProfileLink. */
  nestedLink?: boolean;
}

export function DmUserAvatar({
  name,
  avatarColor,
  avatarUrl,
  size = "md",
  className,
  profileHandle,
  nestedLink,
}: DmUserAvatarProps) {
  return (
    <ProfileLink handle={profileHandle} name={name} nested={nestedLink}>
      <AvatarCircle name={name} avatarColor={avatarColor} avatarUrl={avatarUrl} size={size} className={className} />
    </ProfileLink>
  );
}

function AvatarCircle({ name, avatarColor, avatarUrl, size, className }: Omit<DmUserAvatarProps, "profileHandle" | "nestedLink">) {
  const initial = name.trim().charAt(0).toUpperCase();
  const dim =
    size === "sm" ? "size-9 text-xs" : size === "lg" ? "size-11 text-sm" : "size-10 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", dim, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-black",
        dim,
        className,
      )}
      style={{ backgroundColor: avatarColor }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
