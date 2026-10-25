export const COMMUNITY_DASHBOARD_SECTIONS = [
  "posts",
  "chat",
  "watch-channel",
  "voice-channel",
  "listen-party",
  "announcements",
  "analytics",
  "anime-chat",
  "members",
  "settings",
] as const;

export type CommunityDashboardSection =
  (typeof COMMUNITY_DASHBOARD_SECTIONS)[number];

export function normalizeCommunitySlug(id: string): string {
  return id.trim().toLowerCase();
}

export function getCommunityDetailPath(communityId: string): string {
  return `/community/${normalizeCommunitySlug(communityId)}`;
}

export function isCommunityDashboardSection(
  value: string,
): value is CommunityDashboardSection {
  return (COMMUNITY_DASHBOARD_SECTIONS as readonly string[]).includes(value);
}

export function getCommunityDashboardPath(
  communityId: string,
  section: CommunityDashboardSection = "posts",
): string {
  return `${getCommunityDetailPath(communityId)}/dashboard/${section}`;
}
