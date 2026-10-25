import { Prisma } from "@prisma/client";
import { CacheTags, invalidateTags } from "@/lib/cache/server-cache";

/**
 * Prisma client extension: every database write invalidates the cache tags it affects,
 * so no service can forget to. Per-user data is cleared for the user found in the
 * written row, `where` or `data`; shared data by model.
 *
 * Counter-only updates (viewCount, favoriteCount, likeCount, watch minutes) don't clear
 * shared catalog data — they'd otherwise wipe it on every page view.
 *
 * Writes inside an interactive transaction aren't committed when this runs, so tags are
 * cleared again shortly after ("delayed double delete") to drop anything re-cached from
 * the pre-commit state.
 */

const SHARED_TAGS: Record<string, string[]> = {
  Content: [CacheTags.catalog],
  ContentSeason: [CacheTags.catalog],
  ContentEpisode: [CacheTags.catalog],
  ContentCharacter: [CacheTags.catalog],
  ContentFeaturedTrack: [CacheTags.catalog],
  ContentRelated: [CacheTags.catalog],
  CatalogReview: [CacheTags.catalog],
  Genre: [CacheTags.catalog],
  ContentGenre: [CacheTags.catalog],
  MusicTrack: [CacheTags.catalog],
  Artist: [CacheTags.catalog],
  ArtistMember: [CacheTags.catalog],
  CatalogEmbedding: [CacheTags.embeddings],
  Community: [CacheTags.communities],
  CommunityMember: [CacheTags.communities],
  CommunityPost: [CacheTags.communities],
  CommunityPostLike: [CacheTags.communities],
  CommunityVoiceChannel: [CacheTags.communities],
  CommunityWatchChannel: [CacheTags.communities],
  MatchCircle: [CacheTags.communities],
  Collection: [CacheTags.collections],
  CollectionItem: [CacheTags.collections],
  CollectionFavorite: [CacheTags.collections],
  CollectionFollow: [CacheTags.collections],
  CollectionCollaborator: [CacheTags.collections],
};

/** Fields that point at the user whose cached data a write affects. */
const USER_FIELDS = ["userId", "authorId", "followerId", "followingId", "requesterId", "senderId", "creatorId", "createdById"];

const WRITE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany"]);

const REDELETE_MS = 500;

function isCounterOnly(data: unknown) {
  if (!data || typeof data !== "object") return false;
  const values = Object.values(data as Record<string, unknown>);
  return values.length > 0 && values.every((value) => value !== null && typeof value === "object" && ("increment" in value || "decrement" in value));
}

function userIdsIn(...sources: unknown[]) {
  const ids = new Set<string>();
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 2) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    for (const [key, field] of Object.entries(value as Record<string, unknown>)) {
      if (USER_FIELDS.includes(key) && typeof field === "string") ids.add(field);
      // Compound unique keys, e.g. where: { userId_contentId: { userId, contentId } }.
      else if (key.includes("_") && field && typeof field === "object") visit(field, depth + 1);
    }
  };
  for (const source of sources) visit(source, 0);
  return ids;
}

function invalidateNowAndLater(tags: string[]) {
  if (!tags.length) return;
  invalidateTags(...tags);
  setTimeout(() => invalidateTags(...tags), REDELETE_MS).unref?.();
}

/** Table names in a raw INSERT/UPDATE/DELETE statement. */
function rawWriteTables(args: unknown): string[] {
  const value = Array.isArray(args) ? args[0] : args;
  const text =
    typeof value === "string" ? value
    : value && typeof value === "object" && "strings" in value ? (value as { strings: string[] }).strings.join("?")
    : value && typeof value === "object" && "sql" in value ? String((value as { sql: string }).sql)
    : "";
  return [...text.matchAll(/\b(?:insert\s+into|update|delete\s+from)\s+"(\w+)"/gi)].map((match) => match[1]!);
}

export const cacheInvalidation = Prisma.defineExtension({
  name: "cache-invalidation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        if (WRITE_OPERATIONS.has(operation)) {
          const input = args as { where?: unknown; data?: unknown; create?: unknown; update?: unknown };
          const counterOnly = operation.startsWith("update") && isCounterOnly(input.data);
          const tags = counterOnly ? [] : [...(SHARED_TAGS[model] ?? [])];
          const users = userIdsIn(input.where, input.data, input.create, result);
          // The user row itself.
          if (model === "User" && result && typeof result === "object" && "id" in result) users.add(String((result as { id: string }).id));
          for (const id of users) tags.push(CacheTags.user(id));
          invalidateNowAndLater(tags);
        }
        return result;
      },
    },
    async $executeRaw({ args, query }) {
      const result = await query(args);
      invalidateNowAndLater(rawWriteTables(args).flatMap((table) => SHARED_TAGS[table] ?? []));
      return result;
    },
    async $executeRawUnsafe({ args, query }) {
      const result = await query(args);
      invalidateNowAndLater(rawWriteTables(args).flatMap((table) => SHARED_TAGS[table] ?? []));
      return result;
    },
  },
});
