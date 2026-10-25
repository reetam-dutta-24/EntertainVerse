import { vi, type Mock } from "vitest";

type ModelMock = Record<string, Mock>;
export type PrismaMock = Record<string, ModelMock> & { $transaction: Mock; $queryRaw: Mock; $executeRaw: Mock };

/**
 * Stand-in for the Prisma client: `prisma.<model>.<method>` is a `vi.fn()` created on first
 * access, so a test only sets up the calls it cares about. Unconfigured calls resolve to
 * undefined. Client methods (`$queryRaw`, `$executeRaw`, …) are plain `vi.fn()`s; tagged
 * templates arrive as (strings, ...values). `$transaction` runs callbacks against the same
 * mock and awaits query arrays.
 *
 *   vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../helpers/prisma-mock")).createPrismaMock() }));
 *   const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
 */
export function createPrismaMock(): PrismaMock {
  const members = new Map<string, ModelMock | Mock>();
  const client: PrismaMock = new Proxy({} as PrismaMock, {
    get(_, name: string) {
      if (name === "then") return undefined;
      if (!members.has(name)) {
        members.set(
          name,
          name.startsWith("$")
            ? vi.fn()
            : new Proxy({} as ModelMock, {
                get(methods, method: string) {
                  return (methods[method] ??= vi.fn());
                },
              }),
        );
      }
      return members.get(name);
    },
  });
  members.set("$transaction", vi.fn(async (input: unknown) => (typeof input === "function" ? input(client) : Promise.all(input as unknown[]))));
  return client;
}

/** The SQL of a tagged-template `$queryRaw`/`$executeRaw` call, placeholders as `?`. */
export const rawSql = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?").replace(/\s+/g, " ").trim();
