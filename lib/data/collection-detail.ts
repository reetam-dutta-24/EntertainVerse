import {
  getCollectionDetailBySlug,
} from "@/lib/services/collection.service";
import type { CollectionDetail } from "@/types";
import { normalizeCollectionSlug } from "@/lib/collection-routes";

/**
 * Collection detail — backed by PostgreSQL.
 */

export async function getCollectionDetail(
  collectionId: string,
  viewerUserId?: string,
): Promise<CollectionDetail | null> {
  const slug = normalizeCollectionSlug(collectionId);
  return getCollectionDetailBySlug(slug, viewerUserId);
}
