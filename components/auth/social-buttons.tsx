"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.92l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12.02 12.02 0 0 0 0 10.76l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#5865F2" aria-hidden>
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04c-1.71.3-3.35.81-4.88 1.52a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06c0 .02.01.04.03.05a19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.12c.13-.1.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08 0c.12.11.25.21.37.3a.08.08 0 0 1-.01.13c-.6.34-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.78 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
    </svg>
  );
}

export interface SocialButtonsProps {
  /** Where NextAuth sends the user after OAuth completes. */
  callbackUrl?: string;
  googleEnabled?: boolean;
  discordEnabled?: boolean;
}

/** Google / Discord OAuth buttons with an "or continue with" divider. */
export function SocialButtons({
  callbackUrl = "/dashboard",
  googleEnabled = true,
  discordEnabled = true,
}: SocialButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  if (!googleEnabled && !discordEnabled) return null;

  const single = !(googleEnabled && discordEnabled);

  function start(provider: "google" | "discord") {
    if (pendingProvider) return;
    setPendingProvider(provider);
    // Full-page redirect to the provider; pending stays set until we leave.
    void signIn(provider, { redirectTo: callbackUrl }).catch(() => {
      setPendingProvider(null);
    });
  }

  const buttonClass =
    "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/15" />
        <span className="text-xs text-muted/80">or continue with</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <div
        className={`grid gap-3 ${single ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {googleEnabled ? (
          <button
            type="button"
            onClick={() => start("google")}
            disabled={pendingProvider !== null}
            aria-busy={pendingProvider === "google"}
            className={buttonClass}
          >
            {pendingProvider === "google" ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <GoogleIcon />
            )}
            {single ? "Continue with Google" : "Google"}
          </button>
        ) : null}
        {discordEnabled ? (
          <button
            type="button"
            onClick={() => start("discord")}
            disabled={pendingProvider !== null}
            aria-busy={pendingProvider === "discord"}
            className={buttonClass}
          >
            {pendingProvider === "discord" ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <DiscordIcon />
            )}
            {single ? "Continue with Discord" : "Discord"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
