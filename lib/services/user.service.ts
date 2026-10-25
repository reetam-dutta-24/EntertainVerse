import { cache } from "react";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/lib/validators/auth";

const BCRYPT_ROUNDS = 12;

/** Turn a username into a unique public handle slug. */
export function normalizeHandle(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
}

const AVATAR_COLORS = [
  "#ff00cc",
  "#ae00ff",
  "#2563eb",
  "#00e5ff",
  "#00ff8c",
  "#ffd000",
] as const;

function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export class AuthConflictError extends Error {
  field: "email" | "username";

  constructor(field: "email" | "username") {
    super(
      field === "email"
        ? "An account with this email already exists."
        : "This username is already taken.",
    );
    this.field = field;
    this.name = "AuthConflictError";
  }
}

/** Create a new user with hashed password and default preferences. */
export async function createUser(input: RegisterInput) {
  const handle = normalizeHandle(input.username);
  const email = input.email.toLowerCase();

  const [emailTaken, handleTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { handle }, select: { id: true } }),
  ]);

  if (emailTaken) throw new AuthConflictError("email");
  if (handleTaken) throw new AuthConflictError("username");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.user.create({
    data: {
      email,
      handle,
      name: input.fullName.trim(),
      passwordHash,
      avatarColor: pickAvatarColor(email),
      profileAccent: "pink",
      preferences: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      handle: true,
      name: true,
      avatarColor: true,
      createdAt: true,
    },
  });
}

/** Find a user by email or handle for login. */
export async function findUserForLogin(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  const isEmail = normalized.includes("@");

  return prisma.user.findFirst({
    where: isEmail ? { email: normalized } : { handle: normalizeHandle(identifier) },
    select: {
      id: true,
      email: true,
      handle: true,
      name: true,
      passwordHash: true,
      avatarColor: true,
      avatarUrl: true,
      profileAccent: true,
      onboardingCompletedAt: true,
      role: true,
    },
  });
}

/** Verify a plain password against the stored bcrypt hash. */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

async function uniqueHandle(
  tx: Pick<typeof prisma, "user">,
  seed: string,
): Promise<string> {
  const base = normalizeHandle(seed) || "user";
  let handle = base;
  let suffix = 0;

  while (await tx.user.findUnique({ where: { handle }, select: { id: true } })) {
    suffix += 1;
    handle = `${base}_${suffix}`.slice(0, 30);
  }

  return handle;
}

/** Link an OAuth provider to an existing user or create a new account. */
export async function findOrCreateOAuthUser(input: {
  email: string;
  name: string;
  image?: string | null;
  provider: string;
  providerAccountId: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error("OAuth account is missing an email address.");
  }

  return prisma.$transaction(async (tx) => {
    const linked = await tx.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            handle: true,
            name: true,
            avatarUrl: true,
            onboardingCompletedAt: true,
            role: true,
          },
        },
      },
    });

    if (linked) {
      if (input.image && !linked.user.avatarUrl) {
        return tx.user.update({
          where: { id: linked.user.id },
          data: { avatarUrl: input.image },
          select: {
            id: true,
            email: true,
            handle: true,
            name: true,
            avatarUrl: true,
            onboardingCompletedAt: true,
            role: true,
          },
        });
      }
      return linked.user;
    }

    let user = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        handle: true,
        name: true,
        avatarUrl: true,
        onboardingCompletedAt: true,
        role: true,
      },
    });

    if (!user) {
      const handle = await uniqueHandle(tx, input.name || email.split("@")[0]);
      user = await tx.user.create({
        data: {
          email,
          handle,
          name: input.name.trim() || handle,
          avatarUrl: input.image ?? undefined,
          avatarColor: pickAvatarColor(email),
          profileAccent: "pink",
          emailVerified: new Date(),
          preferences: { create: {} },
        },
        select: {
          id: true,
          email: true,
          handle: true,
          name: true,
          avatarUrl: true,
          onboardingCompletedAt: true,
          role: true,
        },
      });
    } else if (input.image && !user.avatarUrl) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { avatarUrl: input.image },
        select: {
          id: true,
          email: true,
          handle: true,
          name: true,
          avatarUrl: true,
          onboardingCompletedAt: true,
          role: true,
        },
      });
    }

    await tx.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: input.provider,
        providerAccountId: input.providerAccountId,
      },
    });

    return user;
  });
}

/**
 * Load the logged-in user for dashboard layouts and pages. Wrapped in React `cache`
 * so the layout and the page share one query per request.
 */
export const getUserById = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      handle: true,
      email: true,
      avatarColor: true,
      avatarUrl: true,
      aiTasteScore: true,
      onboardingCompletedAt: true,
      role: true,
      createdAt: true,
    },
  });
});
