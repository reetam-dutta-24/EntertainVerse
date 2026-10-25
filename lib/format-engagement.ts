/**
 * Compact engagement count, e.g. 1.2k / 3.4M. Kept free of server imports so client
 * components can use it (importing it from a service would bundle Prisma for the browser).
 */
export function formatEngagementCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}
