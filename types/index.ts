/** Shared domain types for the AniVerse application. */

import type { ListenLink } from "@/lib/listen-links";

export type MediaType =
  | "anime"
  | "show"
  | "movie"
  | "documentary"
  | "kdrama"
  | "song"
  | "album"
  | "artist"
  | "playlist";

export type CommunityVisibility = "public" | "private";

export type ActivityLevel = "very-active" | "active" | "moderate" | "quiet";

import type { AccentColor } from "@/lib/catalog-enums";

export type { AccentColor };

export interface Genre {
  id: string;
  label: string;
}

/** A piece of content (anime, show, movie, or music) shown on cards. */
export interface ContentItem {
  id: string;
  title: string;
  type: MediaType;
  description?: string;
  imageUrl?: string;
  genres: Genre[];
  rating?: number;
  /** AI compatibility score, 0–100. */
  matchScore?: number;
  /** e.g. "4 Seasons", "2019", "Chase Atlantic". */
  meta?: string;
  year?: number;
  accent?: AccentColor;
  /** Present on watchlist-backed cards. */
  watchlistItemId?: string;
  watchlistStatus?: "PENDING" | "WATCHING" | "COMPLETED" | "DROPPED";
  watchlistPriority?: "NORMAL" | "HIGH";
}

/** A song/OST/track shown on music cards. */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  kind: "ost" | "song" | "album";
  /** Source show the track belongs to, e.g. "Demon Slayer". */
  source?: string;
  /** e.g. "Japanese", "Jpop", "English". */
  language?: string;
  rating?: number;
  /** AI compatibility score, 0–100. */
  matchScore?: number;
  imageUrl?: string;
  /** Admin CMS accent — drives card background tint. */
  accent?: AccentColor;
}

export interface Community {
  id: string;
  name: string;
  category: string;
  description?: string;
  memberCount: number;
  postCount: number;
  visibility: CommunityVisibility;
  activityLevel: ActivityLevel;
  /** Average AI match score of members, 0–100. */
  avgMatchScore?: number;
  createdAt?: string;
  lastActiveAt?: string;
  accent?: AccentColor;
  imageUrl?: string;
  wallpaperUrl?: string;
  viewerRole?: MemberRole;
  canEdit?: boolean;
  canDelete?: boolean;
  memberLimit?: number;
  createdAtTime?: number;
  updatedAtTime?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  category?: string;
  collectionKind?: "content" | "music";
  genreLabelIds?: string[];
  itemCount: number;
  favoriteCount: number;
  followerCount?: number;
  visibility: CommunityVisibility;
  createdAt?: string;
  updatedAt?: string;
  /** Raw timestamps for client-side sorting. */
  createdAtTime?: number;
  updatedAtTime?: number;
  accent?: AccentColor;
  imageUrl?: string;
}

/** Featured in-progress item shown in the collection hero (right panel). */
export interface CollectionCurrentActivity {
  title: string;
  /** Full line e.g. "Currently Watching Death Note". */
  statusLabel: string;
  progressLabel?: string;
  episodeLabel?: string;
  seasonLabel?: string;
  imageUrl: string;
  contentId: string;
}

/**
 * Full collection detail — every field maps to a future DB/API response.
 * Used by `/collection/[collectionid]`.
 */
export interface CollectionDetail {
  id: string;
  name: string;
  description: string;
  rating: number;
  trendingLabel?: string;
  genres: Genre[];
  category?: string;
  collectionKind?: "content" | "music";
  genreLabelIds?: string[];
  ownerId?: string;
  visibility: CommunityVisibility;
  createdAt: string;
  updatedAt?: string;
  itemCount: number;
  favoriteCount: number;
  followerCount?: number;
  /** AI compatibility for the collection as a whole. */
  matchScore?: number;
  highlightTags: string[];
  imageUrl?: string;
  accent?: AccentColor;
  engagementStats: ContentEngagementStat[];
  contributors: UserSummary[];
  /** e.g. "Rahul_89, Lk45_89 and Karan_singh45 are 3 contributors". */
  contributorSummary?: string;
  favoriteItems: ContentItem[];
  currentActivity?: CollectionCurrentActivity;
  allItems: ContentItem[];
  continueWatching: ContentItem[];
  watchedMost: ContentItem[];
  musicTracks: MusicTrack[];
  similarCollections: Collection[];
  similarContent: ContentItem[];
  similarTracks: MusicTrack[];
  communities: Community[];
}

/**
 * Music collection detail — same shape as `CollectionDetail` plus artist roster.
 * Used by `/music-collection/[collectionid]`.
 */
export interface MusicCollectionDetail extends CollectionDetail {
  popularArtists: ContentItem[];
  allTracks: MusicTrack[];
  favoriteTracks: MusicTrack[];
  continueListeningTracks: MusicTrack[];
  mostListenedTracks: MusicTrack[];
  similarVibesSongs: MusicTrack[];
}

/** Ordered track row for `/collection/[id]/play` music queue. */
export interface CollectionPlayTrack {
  itemId: string;
  position: number;
  id: string;
  title: string;
  artist: string;
  kind: string;
  source?: string;
  durationSeconds?: number;
  durationLabel: string;
  imageUrl?: string;
  backdropUrl?: string;
  previewUrl: string;
  /** True when no real audio is linked and previewUrl is a demo stream. */
  isDemoPreview?: boolean;
  lyrics?: string;
  language?: string;
  rating?: number;
  description?: string;
  genreLabels: { id: string; label: string }[];
  accent?: ContentItem["accent"];
}

/** Ordered content row for `/collection/[id]/play` binge queue. */
export interface CollectionPlayContentItem {
  itemId: string;
  position: number;
  id: string;
  title: string;
  type: ContentItem["type"];
  imageUrl?: string;
  backdropUrl?: string;
  rating?: number;
  meta?: string;
  year?: number;
  synopsis?: string;
  description?: string;
  genres: { id: string; label: string }[];
  highlightTags?: string[];
  accent?: ContentItem["accent"];
  /** First playable episode for serial titles in a binge queue. */
  defaultEpisodeId?: string;
}

export interface CollectionPlayQueue {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionKind: "content" | "music";
  itemCount: number;
  ownerName: string;
  canManage?: boolean;
  tracks?: CollectionPlayTrack[];
  items?: CollectionPlayContentItem[];
}

export interface ContentPlaySession {
  contentSlug: string;
  contentTitle: string;
  contentType: MediaType;
  imageUrl?: string;
  accent?: AccentColor;
  fallbackVideoUrl?: string;
  currentEpisodeId: string;
  episodes: Episode[];
}

/** A single metric shown in the analytics/stats strip. */
export interface StatMetric {
  id: string;
  label: string;
  value: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface Character {
  id: string;
  name: string;
  /** e.g. "Role: Main Character". */
  role?: string;
  /** Voice actor display name, e.g. "Junya Enoki". */
  voiceActor?: string;
  imageUrl?: string;
  accent?: AccentColor;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  duration?: string;
  description?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  /** Season number, e.g. 1 for S1. */
  seasonNumber?: number;
  /** Resume / continue-watching marker. */
  isLastPlayed?: boolean;
  tags?: string[];
  /** Episode rating out of 10. */
  rating?: number;
  /** Display views, e.g. "2.4M". */
  views?: string;
  /** Display likes, e.g. "15k". */
  likes?: string;
  /** Primary audio language label. */
  language?: string;
  /** Direct MP4/HLS URL for playback. */
  videoUrl?: string;
}

export interface Review {
  id: string;
  author: UserSummary;
  /** Rating out of 10. */
  rating: number;
  content: string;
  /** Short pull-quote shown above the body. */
  headline?: string;
  createdAt?: string;
  likeCount?: number;
  accent?: AccentColor;
  liked?: boolean;
  /** True for persisted user reviews that support the like API. */
  canLike?: boolean;
}

/** Engagement stat tile on a content detail page. */
export interface ContentEngagementStat {
  id: string;
  label: string;
  value: string;
  /** Profile KPI — smooth-scroll target section id. */
  scrollTarget?: string;
  /** Reserved empty slot in the profile hero KPI grid. */
  placeholder?: boolean;
}

/** Structured metadata block — maps 1:1 to DB columns. */
export interface ContentMetadata {
  studio?: string;
  airingDay?: string;
  languages?: string[];
  seasonLabel?: string;
  lastUpdate?: string;
  imdbRating?: number;
  malScore?: number;
  ageRating?: string;
  composer?: string;
  director?: string;
  originalAuthor?: string;
  sourceMaterial?: string;
  producers?: string;
  network?: string;
  country?: string;
  status?: string;
  airedFrom?: string;
  airedTo?: string;
  broadcast?: string;
  episodeDuration?: string;
  releaseYear?: number;
}

export interface ContentSeason {
  id: string;
  label: string;
  episodeCount: number;
  /** 1-based season index (matches episode.seasonNumber). */
  seasonNumber: number;
}

/**
 * Full content detail — every field maps to a future DB/API response.
 * Used by `/content/[contentid]`.
 */
export interface ContentDetail {
  id: string;
  title: string;
  nativeTitle?: string;
  type: MediaType;
  rating: number;
  trendingLabel?: string;
  genres: Genre[];
  /** Full plot summary for the detail hero (may be clamped with an external read-more link). */
  description: string;
  synopsis: string;
  /** IMDb / MyAnimeList search URL for the full plot on an external reference site. */
  referenceUrl: string;
  /** e.g. "AI Match 98%", "All Seasons". */
  highlightTags: string[];
  metadata: ContentMetadata;
  imageUrl: string;
  backdropUrl?: string;
  /** Full-length video URL for movies/documentaries. */
  videoUrl?: string;
  /** Official trailer (YouTube) and TMDB link for "where to watch". */
  trailerUrl?: string;
  tmdbId?: number;
  tmdbKind?: "movie" | "tv";
  /** Full-length audio URL for songs/OSTs. */
  audioUrl?: string;
  /** Song detail — official 30s preview clip and legal listen links. */
  previewUrl?: string;
  listenLinks?: ListenLink[];
  matchScore?: number;
  /** Card accent — drives hero section inner-boundary glow. */
  accent?: AccentColor;
  engagementStats: ContentEngagementStat[];
  seasons: ContentSeason[];
  episodes: Episode[];
  characters: Character[];
  /** Song detail — linked artist profile for catalog cards. */
  linkedArtist?: ContentItem;
  /** Song detail — linked show/movie/anime for catalog cards. */
  linkedSourceContent?: ContentItem;
  featuredOsts: MusicTrack[];
  relatedContent: ContentItem[];
  collections: Collection[];
  communities: Community[];
  reviews: Review[];
  /** User watch progress — drives Continue Watching vs Watch Now CTA. */
  watchProgress?: {
    seasonNumber: number;
    episodeNumber: number;
    episodeTitle?: string;
  };
  /** Song/OST artist credit line under the title. */
  creditLabel?: string;
  /** Audio resume position label, e.g. "1:24". */
  resumeLabel?: string;
  /** Linked show/movie — song watchlist CTA. */
  sourceContentSlug?: string;
  /** Playback length in seconds (songs). */
  durationSeconds?: number;
  /** One line per lyric — synced during inline playback. */
  lyrics?: string;
}

export type MemberRole = "owner" | "admin" | "moderator" | "member";

export interface UserSummary {
  id: string;
  name: string;
  /** Public profile handle used in URLs, e.g. reetam_dutta */
  handle?: string;
  avatarUrl?: string;
  /** Fallback avatar circle color when no image. */
  avatarColor?: string;
}

export interface Member extends UserSummary {
  role: MemberRole;
  online?: boolean;
  joinedAt?: string;
}

export interface CommunityPost {
  id: string;
  author: UserSummary;
  title: string;
  content?: string;
  imageUrl?: string;
  kind?: "post" | "announcement";
  createdAt?: string;
  authorRole?: MemberRole;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  liked?: boolean;
  /** True when the signed-in viewer authored this post. */
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ChatMessage {
  id: string;
  author: UserSummary;
  content: string;
  sentAt?: string;
  /** True when the message belongs to the current user. */
  own?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  edited?: boolean;
  attachment?: {
    url: string;
    name: string;
    kind: "image" | "file";
  };
}

export interface AppNotification {
  id: string;
  title: string;
  /** Notification kind label, e.g. "Episode", "Watch Party". */
  category?: string;
  description?: string;
  createdAt?: string;
  read?: boolean;
  /** Thumbnail shown on the right of the notification. */
  imageUrl?: string;
  /** Related content the notification links out to. */
  href?: string;
  /** Interactive action, e.g. friend_request with actionRefId = request id. */
  actionType?: string;
  actionRefId?: string;
}

export type ViewerFriendStatus =
  | "none"
  | "friends"
  | "pending_outgoing"
  | "pending_incoming";

export interface WatchParty {
  id: string;
  title: string;
  /** Content being watched, e.g. "Jujutsu Kaisen — S2 E14". */
  nowPlaying?: string;
  live?: boolean;
  viewerCount?: number;
  memberLimit?: number;
  participants?: UserSummary[];
  accent?: AccentColor;
  imageUrl?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  viewerJoined?: boolean;
}

export interface VoiceChannel {
  id: string;
  title: string;
  subtitle?: string;
  memberCount?: number;
  memberLimit?: number;
  participants?: UserSummary[];
  accent?: AccentColor;
  hostName?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  viewerJoined?: boolean;
}

export interface CommunityDashboardSettings {
  allowMemberPosts: boolean;
  requireApproval: boolean;
  showOnlineStatus: boolean;
  enableWatchParties: boolean;
  enableVoiceChannels: boolean;
}

/** Mini player state shown in the artist hero right panel. */
export interface ArtistNowPlaying {
  title: string;
  album?: string;
  songId?: string;
  progressPercent?: number;
  elapsedLabel?: string;
  durationLabel?: string;
  imageUrl?: string;
}

/**
 * Full artist detail — maps to `/artist/[artistid]`.
 * Reuses shared card/section types for carousels and reviews.
 */
export interface ArtistDetail {
  id: string;
  title: string;
  nativeTitle?: string;
  rating: number;
  /** e.g. "#10 in Kpop music" */
  rankLeft?: string;
  /** e.g. "#1 in your favourite artist" */
  rankRight?: string;
  genres: Genre[];
  /** Full artist bio for the detail hero (may be clamped with an external read-more link). */
  description: string;
  synopsis: string;
  /** Last.fm search URL for the full biography on an external reference site. */
  referenceUrl: string;
  /** Row-one hero chips — Dance Pop, K-pop, Since 2015, etc. */
  primaryTags: string[];
  metadata: ContentMetadata;
  /** Hero banner / right-panel group photo */
  imageUrl: string;
  accent?: AccentColor;
  matchScore?: number;
  songCount?: number;
  albumCount?: number;
  engagementStats: ContentEngagementStat[];
  members: Character[];
  nowPlaying?: ArtistNowPlaying;
  /** Social followers shown in the right hero panel. */
  connections: UserSummary[];
  connectionSummary?: string;
  followerCount?: number;
  trendingSongs: MusicTrack[];
  allSongs: MusicTrack[];
  mostPlayed: MusicTrack[];
  mostLiked: MusicTrack[];
  albums: MusicTrack[];
  similarArtists: ContentItem[];
  collections: Collection[];
  communities: Community[];
  reviews: Review[];
  /** Viewer-specific state when logged in. */
  viewerFavorited?: boolean;
  viewerFollowing?: boolean;
}

/** Mini player state shown in the profile hero right panel. */
export interface ProfileNowListening {
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  songId?: string;
}

export interface ProfileCurrentlyWatching {
  title: string;
  contentId: string;
  /** True when pulled from an in-progress watchlist item. */
  isActive?: boolean;
  /** e.g. episode label or format meta */
  episodeLabel?: string;
  genres?: Genre[];
  durationLabel?: string;
}

/** Mixed content + music entry for the profile hero activity carousel. */
export type ProfileRecentActivityItem =
  | { id: string; kind: "content"; item: ContentItem }
  | { id: string; kind: "music"; track: MusicTrack };

/**
 * Full user profile — maps to `/profile/[userid]`.
 * Reuses shared card/section types for carousels and reviews.
 */
export interface UserProfileDetail {
  id: string;
  name: string;
  /** Public handle shown in the hero panel, e.g. Reetam_Dutta_2423 */
  handle: string;
  bio: string;
  avatarColor: string;
  avatarUrl?: string;
  /** Catalog accent — drives avatar color and hero theme */
  profileAccent?: AccentColor;
  /** Large hero panel portrait */
  portraitUrl: string;
  location: string;
  online: boolean;
  followerCount: number;
  /** Friend relationship between the signed-in viewer and this profile. */
  viewerFriendStatus?: ViewerFriendStatus;
  /** Pending request id when viewerFriendStatus is pending_incoming. */
  incomingFriendRequestId?: string;
  /** @deprecated Use viewerFriendStatus === "friends". */
  viewerFollows?: boolean;
  /** Limited view when the profile owner hid their profile from the public. */
  isPrivatePreview?: boolean;
  joinedAt: string;
  /** e.g. "Currently Watching Death Note Ep 24" */
  activitySubtitle?: string;
  matchScore?: number;
  primaryTags: string[];
  engagementStats: ContentEngagementStat[];
  nowListening?: ProfileNowListening;
  currentlyWatching?: ProfileCurrentlyWatching;
  favoriteTypes: string[];
  favoriteGenres: string[];
  /** Follower avatars shown in the hero right panel. */
  followers: UserSummary[];
  followerSummary?: string;
  recentActivity: ProfileRecentActivityItem[];
  /** Favorite anime, shows, and K-drama titles. */
  favoriteAnimeShow: ContentItem[];
  /** Favorite movie titles. */
  favoriteMovies: ContentItem[];
  /** Mutual friends on the platform. */
  friends: UserSummary[];
  /** Artists the profile owner follows. */
  followedArtists: ContentItem[];
  /** Dashboard-style analytics for the profile owner. */
  analytics?: import("@/lib/data/analytics").AnalyticsData;
  /** @deprecated Use favoriteAnimeShow / favoriteMovies. */
  currentActivity: ContentItem[];
  /** @deprecated Split into favoriteAnimeShow / favoriteMovies. */
  likedContent: ContentItem[];
  /** @deprecated Kept for compatibility. */
  watchedMost: ContentItem[];
  likedSongs: MusicTrack[];
  mostPlayedSongs: MusicTrack[];
  likedAlbums: MusicTrack[];
  /** @deprecated Use followedArtists. */
  topArtists: ContentItem[];
  collections: Collection[];
  communities: Community[];
  reviews: Review[];
}

export interface CommunityDashboardNavItem {
  id: string;
  label: string;
}

/**
 * Full community detail — maps to `/community/[communityid]`.
 * Reuses shared card/section types for carousels and dashboard preview.
 */
export interface CommunityDetail {
  id: string;
  name: string;
  rating: number;
  rankLeft?: string;
  rankRight?: string;
  genres: Genre[];
  description: string;
  primaryTags: string[];
  matchScore?: number;
  category?: string;
  visibility?: CommunityVisibility;
  activityLevel?: ActivityLevel;
  viewerRole?: MemberRole;
  canEdit?: boolean;
  canDelete?: boolean;
  wallpaperUrl: string;
  imageUrl?: string;
  accent?: AccentColor;
  engagementStats: ContentEngagementStat[];
  members: UserSummary[];
  memberSummary?: string;
  collectionCount?: number;
  popularityLabel?: string;
  globalRankLabel?: string;
  favoriteItems: ContentItem[];
  dashboardOnlineCount: number;
  dashboardPostsToday: number;
  dashboardPosts: CommunityPost[];
  onlineMembers: Member[];
  dashboardNav: CommunityDashboardNavItem[];
  dashboardChatMessages: ChatMessage[];
  dashboardAnimeChatMessages: ChatMessage[];
  dashboardWatchParties: WatchParty[];
  dashboardVoiceChannels: VoiceChannel[];
  dashboardAnnouncements: CommunityPost[];
  dashboardAnalytics: ContentEngagementStat[];
  dashboardMembersWatching: number;
  dashboardMembersInVc: number;
  dashboardSettings: CommunityDashboardSettings;
  watchedMost: ContentItem[];
  trending: ContentItem[];
  musicTracks: MusicTrack[];
  collections: Collection[];
  similarCommunities: Community[];
}
