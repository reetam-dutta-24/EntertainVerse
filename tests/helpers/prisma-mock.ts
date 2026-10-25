import { vi, type Mock } from "vitest";

type ModelMock = Record<string, Mock>;
export type PrismaMock = Record<string, ModelMock> & { $transaction: Mock };

/**
 * Stand-in for the Prisma client: `prisma.<model>.<method>` is a `vi.fn()` created on first
 * access, so a test only sets up the calls it cares about. Unconfigured calls resolve to
 * undefined. `$transaction` runs callbacks against the same mock and awaits query arrays.
 *
 *   vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../helpers/prisma-mock")).createPrismaMock() }));
 *   const prisma = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
 */
export function createPrismaMock(): PrismaMock {
  const models = new Map<string, ModelMock>();
  const client: PrismaMock = new Proxy({} as PrismaMock, {
    get(_, name: string) {
      if (name === "then") return undefined;
      if (!models.has(name)) {
        models.set(
          name,
          new Proxy({} as ModelMock, {
            get(methods, method: string) {
              return (methods[method] ??= vi.fn());
            },
          }),
        );
      }
      return models.get(name);
    },
  });
  const transaction = vi.fn(async (input: unknown) => (typeof input === "function" ? input(client) : Promise.all(input as unknown[])));
  models.set("$transaction", transaction as unknown as ModelMock);
  return client;
}
