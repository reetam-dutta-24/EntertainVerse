import type { ContentItem, MusicTrack } from "@/types";
import { CacheTags, cached } from "@/lib/cache/server-cache";
import { getArtistDetail } from "@/lib/data/artist-detail";
import { getGlobalCommunities } from "@/lib/data/community";
import { getGlobalPublicCollections } from "@/lib/data/collections";
import { getUserDetail } from "@/lib/data/user-detail";
import { getArtistDetailPath } from "@/lib/artist-routes";
import { getCollectionDetailPath } from "@/lib/collection-routes";
import { getCommunityDetailPath } from "@/lib/community-routes";
import {
  getContentDetailPath,
  normalizeContentSlug,
} from "@/lib/content-routes";
import { getProfilePath } from "@/lib/profile-routes";
import { getSongDetailPath } from "@/lib/song-routes";
import {
  listAllCatalogContentItems,
  listAllCatalogMusicTracks,
  listArtistSearchItems,
  searchCatalogArtists,
  searchCatalogContent,
  searchCatalogMusic,
} from "@/lib/services/feed.service";
import { searchUserProfiles } from "@/lib/services/user-profile.service";
import {
  bestFieldScore,
  normalizeSearchQuery,
  scoreSearchMatch,
} from "@/lib/search/utils";
import type {
  ProfileSearchItem,
  SearchPageData,
  SearchPrimaryType,
  SearchResult,
  SearchResultType,
} from "@/lib/search/types";

const profileCatalog: ProfileSearchItem[] = [];

async function searchProfiles(query: string, limit = 8): Promise<ProfileSearchItem[]> {
  const profiles = await searchUserProfiles(query, limit);
  return profiles.length > 0 ? profiles : profileCatalog;
}

async function allContentItems(): Promise<ContentItem[]> {
  const [content, artists] = await Promise.all([
    listAllCatalogContentItems(100),
    listArtistSearchItems(50),
  ]);
  const seen = new Set<string>();
  const items: ContentItem[] = [];
  for (const item of [...content, ...artists]) {
    const slug = normalizeContentSlug(item.id);
    if (seen.has(slug)) continue;
    seen.add(slug);
    items.push({ ...item, id: slug });
  }
  return items;
}

async function allMusicTracks(): Promise<MusicTrack[]> {
  return listAllCatalogMusicTracks(100);
}

function toSearchResult(
  type: SearchResultType,
  id: string,
  title: string,
  subtitle: string | undefined,
  imageUrl: string | undefined,
  href: string,
  score: number,
): SearchResult {
  return { type, id, title, subtitle, imageUrl, href, score };
}

function detectPrimaryType(
  query: string,
  ranked: SearchResult[],
): SearchPrimaryType {
  const top = ranked[0];
  if (!top) return "content";

  const byType = (type: SearchResultType) =>
    ranked.filter((r) => r.type === type).sort((a, b) => b.score - a.score)[0];

  const artistHit = byType("artist");
  const songHit = byType("song");
  const profileHit = byType("profile");
  const contentHit = byType("content");

  const candidates: { type: SearchPrimaryType; score: number }[] = [];
  if (artistHit) candidates.push({ type: "artist", score: artistHit.score });
  if (songHit) candidates.push({ type: "song", score: songHit.score });
  if (profileHit) candidates.push({ type: "profile", score: profileHit.score });
  if (contentHit) candidates.push({ type: "content", score: contentHit.score });

  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0]?.score >= 70) return candidates[0].type;

  if (top.type === "artist") return "artist";
  if (top.type === "song") return "song";
  if (top.type === "profile") return "profile";
  return "content";
}

/** Search hits every keystroke; results are shared by everyone typing the same thing. */
const SEARCH_CACHE = { ttl: 120, swr: 600, tags: [CacheTags.catalog, CacheTags.communities, CacheTags.collections, CacheTags.allUsers] };

export async function searchAutocomplete(
  query: string,
  limit = 8,
): Promise<SearchResult[]> {
  const q = normalizeSearchQuery(query);
  if (q.length < 2) return [];
  return cached(`search:autocomplete:${limit}:${q}`, SEARCH_CACHE, () => runAutocomplete(q, limit));
}

async function runAutocomplete(q: string, limit: number): Promise<SearchResult[]> {

  const [content, songs, artists, profiles, collections, communities] = await Promise.all([
    searchCatalogContent(q, 16),
    searchCatalogMusic(q, 16),
    searchCatalogArtists(q, 8),
    searchProfiles(q, 8),
    getGlobalPublicCollections(),
    getGlobalCommunities(),
  ]);

  const results: SearchResult[] = [];

  for (const item of content) {
    const score = bestFieldScore(
      [item.title, item.type, ...item.genres.map((g) => g.label)],
      q,
    );
    if (score < 50) continue;
    results.push(
      toSearchResult(
        "content",
        item.id,
        item.title,
        item.type,
        item.imageUrl,
        getContentDetailPath(item.id),
        score,
      ),
    );
  }

  for (const artist of artists) {
    const score = bestFieldScore([artist.title, artist.meta ?? "artist"], q);
    if (score < 50) continue;
    results.push(
      toSearchResult(
        "artist",
        artist.id,
        artist.title,
        "Artist",
        artist.imageUrl,
        getArtistDetailPath(artist.id),
        score,
      ),
    );
  }

  for (const track of songs) {
    const score = bestFieldScore(
      [track.title, track.artist, track.source, track.language],
      q,
    );
    if (score < 50) continue;
    results.push(
      toSearchResult(
        "song",
        track.id,
        track.title,
        track.artist,
        track.imageUrl,
        getSongDetailPath(track.id),
        score,
      ),
    );
  }

  for (const profile of profiles) {
    const score = bestFieldScore([profile.name, profile.handle, profile.bio], q);
    if (score < 50) continue;
    results.push(
      toSearchResult(
        "profile",
        profile.id,
        profile.name,
        `@${profile.handle}`,
        profile.portraitUrl,
        getProfilePath(profile.id),
        score,
      ),
    );
  }

  for (const collection of collections.slice(0, 8)) {
    const score = bestFieldScore([collection.name, collection.description], q);
    if (score < 55) continue;
    results.push(
      toSearchResult(
        "collection",
        collection.id,
        collection.name,
        "Collection",
        collection.imageUrl,
        getCollectionDetailPath(collection.id),
        score,
      ),
    );
  }

  for (const community of communities.slice(0, 6)) {
    const score = bestFieldScore([community.name, community.category], q);
    if (score < 55) continue;
    results.push(
      toSearchResult(
        "community",
        community.id,
        community.name,
        community.category,
        community.imageUrl,
        getCommunityDetailPath(community.id),
        score,
      ),
    );
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function getSearchPageData(query: string): Promise<SearchPageData | null> {
  const q = normalizeSearchQuery(query);
  if (!q) return null;
  return cached(`search:page:${query.trim()}`, SEARCH_CACHE, () => runSearchPage(query, q));
}

async function runSearchPage(query: string, q: string): Promise<SearchPageData | null> {

  const suggestions = await searchAutocomplete(q, 24);
  const primaryType = detectPrimaryType(q, suggestions);

  const [contentPool, songPool, artistPool, profiles, collections, communities] =
    await Promise.all([
      allContentItems(),
      allMusicTracks(),
      listArtistSearchItems(50),
      searchProfiles(q, 12),
      getGlobalPublicCollections(),
      getGlobalCommunities(),
    ]);

  const rankMatches = <T,>(
    pool: T[],
    score: (item: T) => number,
    min = 70,
  ): T[] =>
    pool
      .map((item) => ({ item, score: score(item) }))
      .filter((entry) => entry.score >= min)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

  const contentMatches = rankMatches(
    contentPool.filter((item) => item.type !== "artist"),
    (item) => scoreSearchMatch(item.title, q),
  );
  const topContentMatches = contentMatches.length
    ? contentMatches.slice(0, 6)
    : contentPool.filter((i) => i.type !== "artist").slice(0, 1);
  const topContent = topContentMatches[0];

  const songMatches = rankMatches(songPool, (track) =>
    bestFieldScore([track.title, track.artist], q),
  );
  const topSongMatches = songMatches.length
    ? songMatches.slice(0, 6)
    : songPool.slice(0, 1);
  const topSong = topSongMatches[0];

  const artistMatches = rankMatches(
    artistPool,
    (artist) => scoreSearchMatch(artist.title, q),
    60,
  );
  const topArtistMatches = artistMatches.length
    ? artistMatches.slice(0, 6)
    : artistPool.slice(0, 1);
  const topArtist = topArtistMatches[0];

  const topProfile =
    profiles.find(
      (p) =>
        scoreSearchMatch(p.name, q) >= 60 ||
        scoreSearchMatch(p.handle, q) >= 60,
    ) ?? profiles[0];

  const topContentIds = new Set(topContentMatches.map((item) => item.id));
  const topSongIds = new Set(topSongMatches.map((track) => track.id));

  const similarContent = contentPool
    .filter((item) => item.type !== "artist" && !topContentIds.has(item.id))
    .slice(0, 8);

  const similarSongs = songPool
    .filter((t) => !topSongIds.has(t.id))
    .slice(0, 8);

  const artistDetail = topArtist ? await getArtistDetail(topArtist.id) : null;
  const similarArtists = artistPool
    .filter((a) => a.id !== topArtist?.id)
    .slice(0, 8);
  const artistSongs = artistDetail?.allSongs.slice(0, 18) ?? [];

  const similarProfiles = profiles
    .filter((p) => p.id !== topProfile?.id)
    .slice(0, 4);

  return {
    query: query.trim(),
    primaryType,
    topContent,
    topSong,
    topArtist,
    topProfile,
    topContentMatches,
    topSongMatches,
    topArtistMatches,
    similarContent,
    similarSongs,
    similarArtists,
    similarProfiles,
    artistSongs,
    collections: collections.slice(0, 8),
    communities: communities.slice(0, 8),
  };
}

export async function enrichProfileSearch(
  profile: ProfileSearchItem,
): Promise<ProfileSearchItem> {
  const detail = await getUserDetail(profile.id);
  if (!detail) return profile;
  return {
    id: detail.id,
    name: detail.name,
    handle: detail.handle,
    avatarColor: detail.avatarColor,
    portraitUrl: detail.portraitUrl,
    followerCount: detail.followerCount,
    bio: detail.bio,
  };
}
