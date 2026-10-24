import type { RankedItem } from "@/lib/data/analytics";

export interface RankingListProps {
  items: RankedItem[];
}

/** Ranked list with neon progress bars — top titles / top artists. */
export function RankingList({ items }: RankingListProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        No activity logged yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">
                {item.title}
              </p>
              <span className="shrink-0 text-xs font-bold text-brand-pink">
                {item.valueLabel}
              </span>
            </div>
            {item.subtitle ? (
              <p className="truncate text-caption text-muted">{item.subtitle}</p>
            ) : null}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-brand"
                style={{ width: `${Math.min(item.percent, 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
