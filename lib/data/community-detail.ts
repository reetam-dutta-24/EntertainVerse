import {
  getCommunityDetailBySlug,
} from "@/lib/services/community.service";
import type { CommunityDetail } from "@/types";
import { normalizeCommunitySlug } from "@/lib/community-routes";

/**
 * Community detail — backed by PostgreSQL.
 */

export async function getCommunityDetail(
  communityId: string,
  viewerUserId?: string,
): Promise<CommunityDetail | null> {
  const slug = normalizeCommunitySlug(communityId);
  return getCommunityDetailBySlug(slug, viewerUserId);
}
