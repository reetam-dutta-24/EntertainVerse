import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { redirectAuthenticatedAway } from "@/lib/auth-guards";
import { isDiscordAuthEnabled, isGoogleAuthEnabled } from "@/lib/auth";
import { authErrorMessage, safeCallbackUrl } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Sign In — AniVerse",
  description: "Sign in to continue your entertainment universe.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  await redirectAuthenticatedAway();
  const { callbackUrl, error } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your entertainment universe."
      sparkle
    >
      <LoginForm
        googleEnabled={isGoogleAuthEnabled()}
        discordEnabled={isDiscordAuthEnabled()}
        callbackUrl={safeCallbackUrl(callbackUrl)}
        initialError={authErrorMessage(error)}
      />
    </AuthCard>
  );
}
