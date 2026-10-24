"use client";

import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import type { AccentColor } from "@/lib/catalog-enums";
import { AuthInput } from "@/components/auth/auth-input";
import { AccentColorPicker } from "@/components/ui/accent-color-picker";
import { GradientButton } from "@/components/ui/gradient-button";
import { ImageUploadInput } from "@/components/ui/image-upload-input";

interface OnboardingProfileStepProps {
  userName: string;
  onContinue: () => void;
  onSkip: () => void;
}

export function OnboardingProfileStep({
  userName,
  onContinue,
  onSkip,
}: OnboardingProfileStepProps) {
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [profileAccent, setProfileAccent] = useState<AccentColor>("pink");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bio: bio.trim(),
          location: location.trim(),
          profileAccent,
          portraitUrl: portraitUrl.trim() || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not save profile.",
        );
      }
      onContinue();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white sm:text-title">
          Set up your profile, {userName.split(" ")[0]}
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-subtitle">
          Step 1 of 2 — tell the community who you are, then we&apos;ll run your
          taste test and build your personalized universe.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-white/10 bg-glass-purple p-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell the community what you're into…"
            className="w-full resize-none rounded-xl border border-white/20 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-muted/60 focus:border-brand-magenta focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Location
          </label>
          <AuthInput
            icon={MapPin}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, country"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Profile accent
          </label>
          <p className="text-xs text-white/55">
            Colors your avatar and profile hero theme.
          </p>
          <AccentColorPicker value={profileAccent} onChange={setProfileAccent} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Portrait (optional)
          </label>
          <ImageUploadInput
            value={portraitUrl}
            onChange={setPortraitUrl}
            allowManualUrl
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>

      <GradientButton
        size="md"
        className="w-full rounded-full"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Continue to taste test"}
        <ArrowRight className="ms-1.5 size-4" />
      </GradientButton>

      <button
        type="button"
        disabled={saving}
        onClick={onSkip}
        className="text-center text-xs text-muted transition-colors hover:text-brand-pink"
      >
        Skip profile setup for now
      </button>
    </div>
  );
}
