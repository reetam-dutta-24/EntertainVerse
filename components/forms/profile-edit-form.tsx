"use client";

import { useState } from "react";
import { AtSign, MapPin, User } from "lucide-react";
import type { AccentColor } from "@/lib/catalog-enums";
import { AuthInput } from "@/components/auth/auth-input";
import { FormShell } from "@/components/forms/form-shell";
import { AccentColorPicker } from "@/components/ui/accent-color-picker";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import { resolveProfileAccent } from "@/lib/profile-theme";
import type { UserProfileDetail } from "@/types";

export interface ProfileEditFormProps {
  open: boolean;
  profile: UserProfileDetail;
  onClose: () => void;
  onSaved?: (profile: UserProfileDetail) => void;
}

export function ProfileEditForm({
  open,
  profile,
  onClose,
  onSaved,
}: ProfileEditFormProps) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [portraitUrl, setPortraitUrl] = useState(profile.portraitUrl);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [profileAccent, setProfileAccent] = useState<AccentColor>(
    resolveProfileAccent(profile.profileAccent, profile.avatarColor),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          location: location.trim(),
          portraitUrl: portraitUrl.trim(),
          avatarUrl: avatarUrl.trim() || undefined,
          profileAccent,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not save profile.",
        );
      }

      onSaved?.({
        ...profile,
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        portraitUrl: portraitUrl.trim() || profile.portraitUrl,
        avatarUrl: avatarUrl.trim() || undefined,
        profileAccent,
      });
      onClose();
      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      open={open}
      title="Edit profile"
      description="Update how you appear on your public profile."
      onClose={() => !saving && onClose()}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Full name
          </label>
          <AuthInput
            icon={User}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Username
          </label>
          <AuthInput
            icon={AtSign}
            value={profile.handle}
            disabled
            readOnly
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={500}
            disabled={saving}
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
            onChange={(event) => setLocation(event.target.value)}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Profile accent
          </label>
          <p className="text-xs text-white/55">
            Sets your avatar color and profile hero theme.
          </p>
          <AccentColorPicker
            value={profileAccent}
            onChange={setProfileAccent}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            Portrait image
          </label>
          <ImageUploadInput
            value={portraitUrl}
            onChange={setPortraitUrl}
            disabled={saving}
            allowManualUrl
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </FormShell>
  );
}
