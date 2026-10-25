/**
 * Split carousel items into pages of `size`. When the count doesn't divide evenly, the last
 * page shows the final `size` items (overlapping the page before) so no page is half empty.
 */
export function pageItems<T>(items: T[], size: number): T[][] {
  if (items.length === 0 || size <= 0) return [[]];
  const pages: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    const end = start + size;
    pages.push(end > items.length && items.length > size ? items.slice(-size) : items.slice(start, end));
  }
  return pages;
}
