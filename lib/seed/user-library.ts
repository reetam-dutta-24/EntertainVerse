/** @deprecated Use generate-catalog.ts — re-export for backward compatibility. */
export {
  COLLECTION_SEEDS as DEMO_COLLECTIONS,
  COMMUNITY_SEEDS as DEMO_COMMUNITIES,
  DEMO_USER,
  USER_SEEDS,
  buildWatchlistForUser,
} from "./generate-catalog";
import { buildWatchlistForUser, CONTENT_ITEMS } from "./generate-catalog";

export const DEMO_WATCHLIST = buildWatchlistForUser(0, CONTENT_ITEMS);
