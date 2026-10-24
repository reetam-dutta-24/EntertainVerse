"use client";

import { useMemo, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Plus } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Button } from "@/components/ui/button";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/forms/form-shell";
import { ACCENT_OPTIONS } from "@/lib/catalog-enums";
import { communityCategories } from "@/lib/validators/community";
import { slugify } from "@/lib/slugify";

export function CreateCommunityButton() {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] =
    useState<(typeof communityCategories)[number]>("Anime");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [activityLevel, setActivityLevel] = useState<
    "very-active" | "active" | "moderate" | "quiet"
  >("active");
  const [accent, setAccent] = useState("cyan");
  const [imageUrl, setImageUrl] = useState("");
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [memberLimit, setMemberLimit] = useState("50");
  const [joinCode, setJoinCode] = useState("");
  const [issuedJoinCode, setIssuedJoinCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const slugPreview = useMemo(
    () => slug.trim() || slugify(name || "my-community"),
    [name, slug],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slugPreview,
        category,
        description,
        visibility,
        activityLevel,
        accent,
        imageUrl: imageUrl || undefined,
        wallpaperUrl: wallpaperUrl || undefined,
        ...(visibility === "PRIVATE"
          ? {
              memberLimit: Number(memberLimit) || 50,
              joinCode: joinCode.trim() || undefined,
            }
          : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create community.");
      return;
    }

    if (visibility === "PRIVATE" && typeof data.joinCode === "string") {
      setIssuedJoinCode(data.joinCode);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName("");
    setSlug("");
    setDescription("");
    setJoinCode("");
    setIssuedJoinCode(undefined);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setName("");
    setSlug("");
    setDescription("");
    setJoinCode("");
    setIssuedJoinCode(undefined);
    setError(undefined);
    router.refresh();
  }

  return (
    <>
      <GradientButton
        size="sm"
        className="w-full rounded-full px-4 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Plus className="me-1.5 size-4" />
        Create community
      </GradientButton>

      <FormShell
        open={open}
        title="Create community"
        description="Launch a fan space with posts, members, and discovery metadata."
        onClose={handleClose}
      >
        {issuedJoinCode ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-300">
                Private community created
              </p>
              <p className="mt-2 text-xs text-white/70">
                Share this encrypted room code with members you want to invite:
              </p>
              <p className="mt-2 font-mono text-lg font-bold tracking-wide text-white">
                {issuedJoinCode}
              </p>
              <p className="mt-2 text-caption text-white/55">
                Limit: {memberLimit} members · shown once
              </p>
            </div>
            <Button type="button" variant="gradient" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Global Anime Community"
              required
            />
          </FormField>

          <FormField label="Slug" hint={`URL: /community/${slugPreview}`}>
            <TextInput
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={slugPreview}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <SelectInput
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as (typeof communityCategories)[number])
                }
              >
                {communityCategories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Visibility">
              <SelectInput
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as "PUBLIC" | "PRIVATE")
                }
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Description">
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Discuss anime, share recommendations, and host watch parties."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Activity level">
              <SelectInput
                value={activityLevel}
                onChange={(event) =>
                  setActivityLevel(
                    event.target.value as
                      | "very-active"
                      | "active"
                      | "moderate"
                      | "quiet",
                  )
                }
              >
                <option value="very-active">Very Active</option>
                <option value="active">Active</option>
                <option value="moderate">Moderate</option>
                <option value="quiet">Quiet</option>
              </SelectInput>
            </FormField>
            <FormField label="Accent">
              <SelectInput
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
              >
                {ACCENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Card image">
            <ImageUploadInput
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="Or paste an image URL"
            />
          </FormField>

          <FormField label="Wallpaper">
            <ImageUploadInput
              value={wallpaperUrl}
              onChange={setWallpaperUrl}
              placeholder="Or paste a wallpaper URL"
            />
          </FormField>

          {visibility === "PRIVATE" ? (
            <>
              <FormField
                label="Member limit"
                hint="Maximum members who can join with the room code."
              >
                <TextInput
                  type="number"
                  min={2}
                  max={500}
                  value={memberLimit}
                  onChange={(event) => setMemberLimit(event.target.value)}
                  required
                />
              </FormField>
              <FormField
                label="Custom room code (optional)"
                hint="Leave blank to auto-generate an encrypted ROOM-XXXXXX key."
              >
                <TextInput
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(event.target.value.toUpperCase())
                  }
                  placeholder="ROOM-MYCODE"
                  autoComplete="off"
                />
              </FormField>
            </>
          ) : null}

          <FormError message={error} />
          <FormActions
            onCancel={handleClose}
            submitLabel="Create community"
            loading={loading}
          />
        </form>
        )}
      </FormShell>
    </>
  );
}
