"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppRouter } from "@/hooks/use-app-router";
import { signIn } from "next-auth/react";
import { Lock, Mail, User } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { SocialButtons } from "@/components/auth/social-buttons";
import { GradientButton } from "@/components/ui/gradient-button";
import { clearLegacyOnboardingProfile } from "@/lib/onboarding-store";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth-redirect";

export function SignupForm({
  googleEnabled = false,
  discordEnabled = false,
}: {
  googleEnabled?: boolean;
  discordEnabled?: boolean;
}) {
  const router = useAppRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setConfirmError("Passwords don't match.");
      return;
    }
    setConfirmError(undefined);

    setPending(true);

    try {
      // Step 1 — create the user in PostgreSQL via our API
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          username: form.get("username"),
          email: form.get("email"),
          password,
        }),
      });

      const registerData = (await registerRes.json()) as { error?: string };

      if (!registerRes.ok) {
        setError(registerData.error ?? "Could not create your account.");
        return;
      }

      // Step 2 — sign in so NextAuth creates a session cookie
      const result = await signIn("credentials", {
        identifier: form.get("email"),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created, but sign-in failed. Please log in.");
        router.push("/login");
        return;
      }

      clearLegacyOnboardingProfile();
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <AuthInput
        icon={User}
        name="fullName"
        placeholder="Full name"
        autoComplete="name"
        required
      />
      <AuthInput
        icon={User}
        name="username"
        placeholder="Username"
        autoComplete="username"
        required
      />
      <AuthInput
        icon={Mail}
        type="email"
        name="email"
        placeholder="Email address"
        autoComplete="email"
        required
      />
      <AuthInput
        icon={Lock}
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="new-password"
        required
      />
      <AuthInput
        icon={Lock}
        type="password"
        name="confirmPassword"
        placeholder="Confirm password"
        error={confirmError}
        autoComplete="new-password"
        required
      />

      <label className="flex cursor-pointer items-center gap-2 text-xs text-white">
        <input
          type="checkbox"
          name="terms"
          required
          className="size-3.5 cursor-pointer accent-brand-magenta"
        />
        <span>
          I agree to the{" "}
          <Link href="#" className="text-brand-magenta hover:text-brand-pink">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="text-brand-magenta hover:text-brand-pink">
            Privacy Policy
          </Link>
        </span>
      </label>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <GradientButton type="submit" size="md" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </GradientButton>

      {/* Dashboard layout sends brand-new Google users on to onboarding,
          while existing accounts skip it instead of retaking the quiz. */}
      <SocialButtons
        callbackUrl={DEFAULT_POST_AUTH_PATH}
        googleEnabled={googleEnabled}
        discordEnabled={discordEnabled}
      />

      <p className="mt-1 text-center text-xs text-white">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-magenta transition-colors hover:text-brand-pink"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
