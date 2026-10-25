import { PrismaClient } from "@prisma/client";
import { cacheInvalidation } from "@/lib/cache/invalidation";

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reload can create many Prisma instances.
 * We attach one instance to `globalThis` so the connection pool is reused.
 *
 * Every write goes through the cache-invalidation extension. It only hooks queries and
 * doesn't change the client's API, so the client keeps its plain `PrismaClient` type.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  }).$extends(cacheInvalidation) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
