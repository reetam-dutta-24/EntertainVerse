/** Standard dashboard grid — up to 6 columns × 2 rows per page. */
export const GRID_COLS = 6;
export const GRID_ROWS = 2;
export const GRID_ITEMS_PER_PAGE = GRID_COLS * GRID_ROWS;

/** Carousel pagination — fixed items per page (app-wide default). */
export const CAROUSEL_ITEMS_CONTENT = 6;
export const CAROUSEL_ITEMS_COMMUNITY = 5;
export const CAROUSEL_ITEMS_EPISODE = 3;
export const CAROUSEL_ITEMS_REVIEW = 3;

/** Community / collection grid — up to 5 columns × 2 rows per page. */
export const COMMUNITY_GRID_COLS = 5;
export const COMMUNITY_GRID_ROWS = 2;
export const COMMUNITY_GRID_ITEMS_PER_PAGE =
  COMMUNITY_GRID_COLS * COMMUNITY_GRID_ROWS;

/** Carousel row — scales from 2 cols (mobile) to 6 cols (desktop). */
export const CAROUSEL_COLS_BREAKPOINTS = [
  { minWidth: 1200, cols: 6 },
  { minWidth: 1024, cols: 4 },
  { minWidth: 768, cols: 3 },
  { minWidth: 0, cols: 2 },
] as const;

/**
 * Carousel rows fit as many 148px cards as their own width holds (12px apart), so a docked
 * assistant or a wide screen changes the count; the breakpoints above cover the first render.
 */
export const CAROUSEL_FIT = { slotWidth: 148, gap: 12, min: 2, max: 10 } as const;

/** Community / collection tile grids — fluid tiles up to 180px, fitted to the grid's width. */
export const CARD_GRID_FIT = { slotWidth: 168, gap: 14, min: 2, max: 7 } as const;

/** Watchlist / poster grid — same breakpoints as carousel. */
export const POSTER_GRID_COLS_BREAKPOINTS = CAROUSEL_COLS_BREAKPOINTS;

/** Music grid — 6 columns × 3 rows per page (artist song browse). */
export const MUSIC_GRID_COLS = 6;
export const MUSIC_GRID_ROWS = 3;
export const MUSIC_GRID_ITEMS_PER_PAGE = MUSIC_GRID_COLS * MUSIC_GRID_ROWS;

/** Community / collection card grid — scales from 2 to 5 cols. */
export const CARD_GRID_COLS_BREAKPOINTS = [
  { minWidth: 1280, cols: 5 },
  { minWidth: 1024, cols: 4 },
  { minWidth: 768, cols: 3 },
  { minWidth: 0, cols: 2 },
] as const;
