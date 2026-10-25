import type {
  Community,
  CommunityMember,
  CommunityPost,
  MemberRole as PrismaMemberRole,
  User,
} from "@prisma/client";
import { formatCardDate, formatPostedAt, formatRelativeTime } from "@/lib/format-dates";
import type {
  AccentColor,
  ActivityLevel,
  Community as AppCommunity,
  Collection as AppCollection,
  CommunityDashboardNavItem,
  CommunityDashboardSettings,
  CommunityDetail,
  CommunityPost as AppCommunityPost,
  ContentEngagementStat,
  Member,
  MemberRole,
  UserSummary,
} from "@/types";

type CommunityWithCounts = Community & {
  members?: (CommunityMember & {
    user: Pick<User, "id" | "name" | "handle" | "avatarColor" | "avatarUrl" | "aiTasteScore">;
  })[];
};

type CommunityPostWithAuthor = CommunityPost & {
  author: Pick<User, "id" | "name" | "avatarColor" | "avatarUrl">;
};

function mapVisibility(value: Community["visibility"]): AppCommunity["visibility"] {
  return value === "PUBLIC" ? "public" : "private";
}

function mapMemberRole(role: PrismaMemberRole): MemberRole {
  if (role === "ADMIN") return "admin";
  if (role === "MODERATOR") return "moderator";
  return "member";
}

function resolveActivityLevel(
  row: Community,
  override?: string | null,
): ActivityLevel {
  if (
    override === "very-active" ||
    override === "active" ||
    override === "moderate" ||
    override === "quiet"
  ) {
    return override;
  }
  if (row.postCount >= 100 || row.memberCount >= 1000) return "very-active";
  if (row.postCount >= 20) return "active";
  if (row.postCount >= 5) return "moderate";
  return "quiet";
}

function averageMemberScore(
  members: CommunityWithCounts["members"] = [],
): number | undefined {
  if (members.length === 0) return undefined;
  const scores = members
    .map((member) => member.user.aiTasteScore)
    .filter((score) => score > 0);
  if (scores.length === 0) return 92;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function mapCommunityToCard(row: Community): AppCommunity {
  return {
    id: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category,
    memberCount: row.memberCount,
    postCount: row.postCount,
    visibility: mapVisibility(row.visibility),
    activityLevel: resolveActivityLevel(row, row.activityLevel),
    avgMatchScore: undefined,
    createdAt: formatCardDate(row.createdAt),
    lastActiveAt: formatRelativeTime(row.updatedAt),
    accent: (row.accent as AccentColor) ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    memberLimit: row.memberLimit ?? undefined,
    createdAtTime: row.createdAt.getTime(),
    updatedAtTime: row.updatedAt.getTime(),
  };
}

export function mapCommunityToCardWithMembers(
  row: CommunityWithCounts,
  viewerUserId?: string,
): AppCommunity {
  const card = mapCommunityToCard(row);
  const membership = viewerUserId
    ? row.members?.find((member) => member.userId === viewerUserId)
    : undefined;
  const viewerRole = membership ? mapMemberRole(membership.role) : undefined;

  return {
    ...card,
    description: row.description ?? undefined,
    wallpaperUrl: row.wallpaperUrl ?? undefined,
    avgMatchScore: averageMemberScore(row.members),
    viewerRole,
    canEdit: viewerRole === "admin" || viewerRole === "moderator",
    canDelete: viewerRole === "admin",
  };
}

export function mapUserSummary(
  user: Pick<User, "id" | "name" | "handle" | "avatarColor" | "avatarUrl">,
): UserSummary {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
  };
}

export function mapCommunityPost(
  row: CommunityPostWithAuthor,
  context?: {
    authorRole?: MemberRole;
    viewerUserId?: string;
    viewerIsStaff?: boolean;
    likedByViewer?: boolean;
  },
): AppCommunityPost {
  const isAuthor = context?.viewerUserId === row.authorId;
  const canDelete = isAuthor || Boolean(context?.viewerIsStaff);

  return {
    id: row.id,
    author: {
      id: row.author.id,
      name: row.author.name,
      avatarColor: row.author.avatarColor,
      avatarUrl: row.author.avatarUrl ?? undefined,
    },
    title: row.title,
    content: row.content ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    kind: row.kind === "ANNOUNCEMENT" ? "announcement" : "post",
    createdAt: formatPostedAt(row.createdAt),
    authorRole: context?.authorRole,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    shareCount: row.shareCount,
    liked: context?.likedByViewer ?? false,
    canEdit: isAuthor,
    canDelete,
  };
}

export function mapCommunityMember(
  row: CommunityMember & {
    user: Pick<User, "id" | "name" | "avatarColor" | "avatarUrl">;
  },
): Member {
  return {
    id: row.user.id,
    name: row.user.name,
    avatarColor: row.user.avatarColor,
    avatarUrl: row.user.avatarUrl ?? undefined,
    role: mapMemberRole(row.role),
    joinedAt: formatCardDate(row.joinedAt),
    online: true,
  };
}

const defaultDashboardNav: CommunityDashboardNavItem[] = [
  { id: "posts", label: "Posts" },
  { id: "chat", label: "General Chat" },
  { id: "watch-channel", label: "Watch Party" },
  { id: "listen-party", label: "Listen Party" },
  { id: "voice-channel", label: "Talk Rooms" },
  { id: "announcements", label: "Announcements" },
  { id: "analytics", label: "Analytics" },
  { id: "anime-chat", label: "Anime Chat" },
  { id: "settings", label: "Settings" },
];

const defaultDashboardSettings: CommunityDashboardSettings = {
  allowMemberPosts: true,
  requireApproval: false,
  showOnlineStatus: true,
  enableWatchParties: true,
  enableVoiceChannels: true,
};

export function mapCommunityToDetail(
  row: CommunityWithCounts,
  options: {
    posts?: CommunityPostWithAuthor[];
    announcements?: CommunityPostWithAuthor[];
    voiceChannels?: import("@/types").VoiceChannel[];
    watchChannels?: import("@/types").WatchParty[];
    memberPreview?: UserSummary[];
    onlineMembers?: Member[];
    collections?: AppCollection[];
    similarCommunities?: AppCommunity[];
    watchedMost?: import("@/types").ContentItem[];
    trending?: import("@/types").ContentItem[];
    musicTracks?: import("@/types").MusicTrack[];
    favoriteItems?: import("@/types").ContentItem[];
    viewerUserId?: string;
    likedPostIds?: Set<string>;
  } = {},
): CommunityDetail {
  const members = (row.members ?? []).map((member) => mapUserSummary(member.user));
  const memberPreview = options.memberPreview ?? members.slice(0, 6);
  const memberRoleByUserId = new Map(
    (row.members ?? []).map((member) => [member.userId, mapMemberRole(member.role)]),
  );
  const viewerIsStaff =
    options.viewerUserId != null &&
    (row.members ?? []).some(
      (member) =>
        member.userId === options.viewerUserId &&
        (member.role === "ADMIN" || member.role === "MODERATOR"),
    );

  const mapPostWithContext = (post: CommunityPostWithAuthor) =>
    mapCommunityPost(post, {
      authorRole: memberRoleByUserId.get(post.authorId),
      viewerUserId: options.viewerUserId,
      viewerIsStaff,
      likedByViewer: options.likedPostIds?.has(post.id) ?? false,
    });

  const posts = (options.posts ?? []).map(mapPostWithContext);
  const announcements = (options.announcements ?? []).map(mapPostWithContext);
  const voiceChannels = options.voiceChannels ?? [];
  const watchChannels = options.watchChannels ?? [];
  const onlineMembers =
    options.onlineMembers ?? (row.members ?? []).slice(0, 8).map(mapCommunityMember);

  const viewerMembership = options.viewerUserId
    ? row.members?.find((member) => member.userId === options.viewerUserId)
    : undefined;
  const viewerRole = viewerMembership
    ? mapMemberRole(viewerMembership.role)
    : undefined;

  const dashboardNav: CommunityDashboardNavItem[] = [
    ...defaultDashboardNav.filter((item) => item.id !== "settings"),
    ...(row.visibility === "PRIVATE" && viewerRole === "admin"
      ? [{ id: "members" as const, label: "Invite Friends" }]
      : []),
    { id: "settings", label: "Settings" },
  ];

  const engagementStats: ContentEngagementStat[] = [
    { id: "posts", label: "Posts", value: String(row.postCount) },
    { id: "members", label: "Members", value: String(row.memberCount) },
    {
      id: "activity",
      label: "Activity",
      value: resolveActivityLevel(row, row.activityLevel),
    },
    {
      id: "visibility",
      label: "Visibility",
      value: row.visibility === "PUBLIC" ? "Public" : "Private",
    },
  ];

  const avgMatch = averageMemberScore(row.members);

  return {
    id: row.slug,
    name: row.name,
    rating: 9.2,
    rankLeft: row.visibility === "PUBLIC" ? "Public community" : "Private community",
    rankRight: `${row.memberCount.toLocaleString()} members`,
    genres: [
      { id: row.category.toLowerCase(), label: row.category },
      { id: "community", label: "Community" },
    ],
    description: row.description ?? `${row.name} on EntertainVerse.`,
    primaryTags: [row.category, row.visibility === "PUBLIC" ? "Public" : "Private"],
    matchScore: avgMatch,
    category: row.category,
    visibility: mapVisibility(row.visibility),
    activityLevel: resolveActivityLevel(row, row.activityLevel),
    viewerRole,
    canEdit: viewerRole === "admin" || viewerRole === "moderator",
    canDelete: viewerRole === "admin",
    wallpaperUrl:
      row.wallpaperUrl ?? row.imageUrl ?? "/images/posters/jujutsu-kaisen.jpg",
    imageUrl: row.imageUrl ?? undefined,
    accent: (row.accent as AccentColor) ?? "cyan",
    engagementStats,
    members: memberPreview,
    memberSummary:
      row.memberCount >= 1000
        ? `${Math.round(row.memberCount / 1000)}k+ members`
        : `${row.memberCount} members`,
    collectionCount: options.collections?.length ?? 0,
    popularityLabel: row.memberCount >= 1000 ? "Popular" : "Growing",
    globalRankLabel:
      row.visibility === "PUBLIC" ? "Discoverable globally" : "Invite only",
    favoriteItems: options.favoriteItems ?? [],
    dashboardOnlineCount: Math.min(row.memberCount, onlineMembers.length * 12 + 8),
    dashboardPostsToday: Math.min(
      posts.length,
      posts.filter((post) => post.createdAt?.includes("hr")).length || posts.length,
    ),
    dashboardPosts: posts,
    onlineMembers,
    dashboardNav,
    dashboardChatMessages: [],
    dashboardAnimeChatMessages: [],
    dashboardWatchParties: watchChannels,
    dashboardVoiceChannels: voiceChannels,
    dashboardAnnouncements: announcements,
    dashboardAnalytics: [
      {
        id: "active",
        label: "Active Members",
        value: String(Math.min(row.memberCount, 120 + posts.length * 3)),
      },
      { id: "posts", label: "Posts", value: String(row.postCount) },
      { id: "members", label: "Members", value: String(row.memberCount) },
    ],
    dashboardMembersWatching: watchChannels.reduce(
      (sum, channel) => sum + (channel.viewerCount ?? 0),
      0,
    ),
    dashboardMembersInVc: voiceChannels.reduce(
      (sum, channel) => sum + (channel.memberCount ?? 0),
      0,
    ),
    dashboardSettings: defaultDashboardSettings,
    watchedMost: options.watchedMost ?? [],
    trending: options.trending ?? [],
    musicTracks: options.musicTracks ?? [],
    collections: options.collections ?? [],
    similarCommunities: options.similarCommunities ?? [],
  };
}
