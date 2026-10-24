import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import {
  findOrCreateOAuthUser,
  findUserForLogin,
  verifyPassword,
} from "@/lib/services/user.service";
import { loginSchema } from "@/lib/validators/auth";
import {
  OAUTH_ACCOUNT_SAVE_FAILED,
  OAUTH_EMAIL_NOT_VERIFIED,
} from "@/lib/auth-redirect";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      identifier: { label: "Email or Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { identifier, password } = parsed.data;
      const user = await findUserForLogin(identifier);
      if (!user) return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        image: user.avatarUrl ?? undefined,
        onboardingCompleted: !!user.onboardingCompletedAt,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Always show the account chooser so users can switch Google accounts.
      authorization: { params: { prompt: "select_account" } },
    }),
  );
}

if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
  providers.push(
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
    // OAuth failures land back on the login card with ?error=<code>.
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email) return false;

      // We link OAuth logins to existing accounts by email, so the provider
      // must vouch for that email — otherwise anyone could claim it.
      const emailVerified =
        account.provider === "google"
          ? profile?.email_verified === true
          : account.provider === "discord"
            ? profile?.verified === true
            : false;
      if (!emailVerified) return `/login?error=${OAUTH_EMAIL_NOT_VERIFIED}`;

      try {
        const dbUser = await findOrCreateOAuthUser({
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });

        user.id = dbUser.id;
        user.handle = dbUser.handle;
        user.onboardingCompleted = !!dbUser.onboardingCompletedAt;
        user.role = dbUser.role;
        user.name = dbUser.name;
        user.email = dbUser.email;
        user.image = dbUser.avatarUrl ?? user.image;
        return true;
      } catch (error) {
        console.error("[auth signIn oauth]", error);
        return `/login?error=${OAUTH_ACCOUNT_SAVE_FAILED}`;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.handle = user.handle;
        token.onboardingCompleted = user.onboardingCompleted ?? false;
        token.role = user.role;
      }

      if (trigger === "update" && session?.onboardingCompleted === true) {
        token.onboardingCompleted = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.handle = token.handle as string;
        session.user.onboardingCompleted = token.onboardingCompleted === true;
        session.user.role =
          (token.role as import("@prisma/client").PlatformRole) ?? "USER";
      }
      return session;
    },
  },
});

export function isGoogleAuthEnabled() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isDiscordAuthEnabled() {
  return Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
}
