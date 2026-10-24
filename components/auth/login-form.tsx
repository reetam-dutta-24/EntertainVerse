"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppRouter } from "@/hooks/use-app-router";
import { signIn } from "next-auth/react";
import { Lock, User } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { SocialButtons } from "@/components/auth/social-buttons";
import { GradientButton } from "@/components/ui/gradient-button";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth-redirect";

export interface LoginFormProps {
  googleEnabled?: boolean;
  discordEnabled?: boolean;
  /** Validated return path (e.g. from middleware) — used once onboarding is done. */
  callbackUrl?: string;
  /** Error shown on load, e.g. after a failed Google sign-in. */
  initialError?: string | null;
}

export function LoginForm({
  googleEnabled = false,
  discordEnabled = false,
  callbackUrl,
  initialError = null,
}: LoginFormProps) {
  const router = useAppRouter();
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      identifier: form.get("identifier"),
      password: form.get("password"),
      redirect: false,
    });

    setPending(false);
    if (result?.error) {
      setError("Invalid email/username or password.");
      return;
    }

    const destRes = await fetch("/api/auth/redirect-destination");
    const destData = (await destRes.json()) as { destination?: string };
    const destination = destData.destination ?? DEFAULT_POST_AUTH_PATH;
    // Onboarding always wins; otherwise honour where the user was headed.
    router.push(
      destination === DEFAULT_POST_AUTH_PATH && callbackUrl ? callbackUrl : destination,
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AuthInput
        icon={User}
        name="identifier"
        placeholder="Email or Username"
        autoComplete="username"
        required
      />
      <AuthInput
        icon={Lock}
        type="password"
        name="password"
        placeholder="Password"
        autoComplete="current-password"
        required
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-white">
          <input
            type="checkbox"
            name="remember"
            className="size-3.5 cursor-pointer appearance-auto accent-brand-magenta"
          />
          Remember me
        </label>
        <Link
          href="#"
          className="text-xs font-medium text-brand-magenta transition-colors hover:text-brand-pink"
        >
          Forgot password?
        </Link>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <GradientButton type="submit" size="md" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </GradientButton>

      <SocialButtons
        callbackUrl={callbackUrl ?? DEFAULT_POST_AUTH_PATH}
        googleEnabled={googleEnabled}
        discordEnabled={discordEnabled}
      />

      <p className="mt-1 text-center text-xs text-white">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-magenta transition-colors hover:text-brand-pink"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
