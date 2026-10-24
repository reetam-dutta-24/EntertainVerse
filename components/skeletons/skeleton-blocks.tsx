import { Skeleton } from "@/components/ui/skeleton";
import { COLLECTION_CARD_H, POSTER_SLOT_H, SLOT_W } from "@/lib/card-dimensions";
import { cn } from "@/lib/utils";

/**
 * Building blocks for route skeletons. Server components with pure CSS
 * breakpoints (mirroring lib/grid-section-config.ts) so they paint instantly.
 */

/** Carousel rows show 2 → 3 → 4 → 6 slots (CAROUSEL_COLS_BREAKPOINTS). */
const CAROUSEL_SLOT_VISIBILITY = [
  "",
  "",
  "hidden md:block",
  "hidden lg:block",
  "hidden min-[1200px]:block",
  "hidden min-[1200px]:block",
];

/** Card grids show 2 → 3 → 4 → 5 columns (CARD_GRID_COLS_BREAKPOINTS). */
const CARD_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export function SkeletonSectionHeader({
  withSearch = true,
  withSubtitle = true,
  className,
}: {
  withSearch?: boolean;
  withSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-6 w-52 max-w-full rounded-lg sm:h-7 sm:w-64" />
        {withSubtitle ? <Skeleton className="h-4 w-72 max-w-full" /> : null}
      </div>
      {withSearch ? <Skeleton className="h-9 w-full rounded-full sm:w-[230px]" /> : null}
    </div>
  );
}

/** One poster / music card slot, sized like the real carousel cards. */
export function SkeletonMediaCard({ round = false }: { round?: boolean }) {
  return (
    <div
      className="mx-auto flex w-full flex-col gap-2.5 rounded-[20px] border border-white/[0.06] bg-glass-purple/60 p-3"
      style={{ maxWidth: SLOT_W, height: POSTER_SLOT_H - 8 }}
    >
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton
        className={cn(
          "mx-auto mt-1 shrink-0",
          round ? "size-[104px] rounded-full" : "h-[100px] w-full rounded-[14px]",
        )}
      />
      <div className="mt-auto flex flex-col items-center gap-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Section header + one carousel row of media cards. */
export function SkeletonCarouselSection({
  round = false,
  withSearch = true,
}: {
  round?: boolean;
  withSearch?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <SkeletonSectionHeader withSearch={withSearch} />
      <div className="grid grid-cols-2 gap-3 px-2 py-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 min-[1200px]:grid-cols-6">
        {CAROUSEL_SLOT_VISIBILITY.map((visibility, i) => (
          <div key={i} className={visibility}>
            <SkeletonMediaCard round={round} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 pt-1">
        <Skeleton className="h-1.5 w-6 rounded-full" />
        <Skeleton className="h-1.5 w-1.5 rounded-full" />
        <Skeleton className="h-1.5 w-1.5 rounded-full" />
      </div>
    </section>
  );
}

/** Community / collection card. */
export function SkeletonTileCard() {
  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-[20px] border border-white/[0.06] bg-glass-purple/60"
      style={{ height: COLLECTION_CARD_H }}
    >
      <Skeleton className="h-[72px] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-auto h-8 w-full rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 10 }: { count?: number }) {
  return (
    <div className={CARD_GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTileCard key={i} />
      ))}
    </div>
  );
}

/** Pink gradient welcome banner placeholder. */
export function SkeletonBanner() {
  return (
    <div className="rounded-2xl bg-glass-magenta px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <Skeleton className="h-6 w-56 max-w-full bg-white/15 sm:h-7 sm:w-80" />
      <Skeleton className="mt-2.5 h-4 w-full max-w-[520px] bg-white/10" />
      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:gap-6">
        <Skeleton className="h-3 w-36 bg-white/10" />
        <Skeleton className="h-3 w-40 bg-white/10" />
        <Skeleton className="h-3 w-32 bg-white/10" />
      </div>
    </div>
  );
}

/** "Your AI Taste Profile" bar placeholder. */
export function SkeletonTasteBar() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-glass-purple px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="h-9 w-full rounded-full sm:w-32" />
    </div>
  );
}

/** Stat panel: `grid-cols-2 lg:grid-cols-4` tiles in a surface card. */
export function SkeletonStatPanel({ tiles = 4, withHeader = true }: { tiles?: number; withHeader?: boolean }) {
  return (
    <section className="rounded-2xl bg-surface/40 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      {withHeader ? (
        <>
          <Skeleton className="h-6 w-56 max-w-full sm:h-7" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </>
      ) : null}
      <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", withHeader && "mt-4")}>
        {Array.from({ length: tiles }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-xl bg-glass-magenta px-3 py-3 sm:px-4 sm:py-4"
          >
            <Skeleton className="h-3 w-20 bg-white/15" />
            <Skeleton className="h-6 w-12 bg-white/15 sm:h-7" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Filter chip row (`flex-col sm:flex-row`). */
export function SkeletonFilterRow({ chips = 5 }: { chips?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface/40 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <Skeleton className="h-4 w-16" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: chips }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Detail-route hero: copy column + artwork column on desktop,
 * artwork stacked first on mobile (matches ContentDetailHero / ProfileDetailHero).
 */
export function SkeletonDetailHero({ variant = "media" }: { variant?: "media" | "profile" }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-glass-purple to-transparent">
      <div className="grid w-full grid-cols-1 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)]">
        <div className="order-2 flex flex-col gap-4 px-5 py-6 sm:px-8 lg:order-1 lg:justify-center lg:px-10 xl:px-14">
          {variant === "profile" ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-[72px] shrink-0 rounded-full sm:size-20" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-48 sm:h-9 sm:w-64" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="h-9 w-3/4 rounded-lg sm:h-12" />
              <Skeleton className="h-4 w-1/3" />
            </>
          )}
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <Skeleton className="h-11 w-full rounded-full sm:w-40" />
            <Skeleton className="h-11 w-full rounded-full sm:w-36" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Skeleton className="aspect-[16/10] w-full rounded-none lg:aspect-auto lg:h-full" />
        </div>
      </div>
    </section>
  );
}

/** Detail-route body wrapper (matches detail pages' max-w-[1440px] column). */
export function SkeletonDetailBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pt-8 sm:gap-12 sm:px-8 lg:gap-14 lg:px-12">
      {children}
    </div>
  );
}

/** Row list: friends, notifications, conversations. */
export function SkeletonListRows({ rows = 6, withAction = false }: { rows?: number; withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          {withAction ? <Skeleton className="hidden h-8 w-20 rounded-full sm:block" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Admin CMS table: header row + body rows; collapses columns on mobile. */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  const colClass = (i: number) => (i >= 2 ? "hidden md:block" : "");
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className={cn("h-3 flex-1", colClass(i))} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-white/[0.05] px-4 py-3.5 last:border-b-0">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          {Array.from({ length: cols - 1 }, (_, i) => (
            <Skeleton key={i} className={cn("h-4 flex-1", colClass(i + 1))} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stacked form fields (settings, admin create/edit). */
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-[10px]" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-28 w-full rounded-[10px]" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Skeleton className="h-10 w-full rounded-full sm:w-28" />
        <Skeleton className="h-10 w-full rounded-full sm:w-36" />
      </div>
    </div>
  );
}

/** Chart card placeholder for analytics panels. */
export function SkeletonChartPanel({ className, tall = false }: { className?: string; tall?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl bg-surface/40 p-4 sm:p-6", className)}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-60 max-w-full" />
      </div>
      <Skeleton className={cn("w-full rounded-xl", tall ? "h-64 sm:h-72" : "h-56")} />
    </div>
  );
}
