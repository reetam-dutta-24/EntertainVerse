import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { redirectAuthenticatedAway } from "@/lib/auth-guards";
import { isDiscordAuthEnabled, isGoogleAuthEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign up — AniVerse",
  description: "Start building your personalized entertainment universe.",
};

export default async function SignupPage() {
  await redirectAuthenticatedAway();

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start building your personalized entertainment universe."
    >
      <SignupForm
        googleEnabled={isGoogleAuthEnabled()}
        discordEnabled={isDiscordAuthEnabled()}
      />
    </AuthCard>
  );
}
