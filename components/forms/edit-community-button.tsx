"use client";

import { cloneElement, isValidElement, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
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
import { CommunityJoinCodePanel } from "@/components/forms/community-join-code-panel";

export interface CommunityEditValues {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  visibility?: "public" | "private";
  activityLevel?: "very-active" | "active" | "moderate" | "quiet";
  accent?: string;
  imageUrl?: string;
  wallpaperUrl?: string;
  memberLimit?: number;
  canDelete?: boolean;
}

export function EditCommunityButton({
  community,
  trigger,
}: {
  community: CommunityEditValues;
  trigger?: React.ReactNode;
}) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [category, setCategory] =
    useState<(typeof communityCategories)[number]>(
      (community.category as (typeof communityCategories)[number]) ?? "Anime",
    );
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(
    community.visibility === "private" ? "PRIVATE" : "PUBLIC",
  );
  const [activityLevel, setActivityLevel] = useState<
    "very-active" | "active" | "moderate" | "quiet"
  >(community.activityLevel ?? "active");
  const [accent, setAccent] = useState(community.accent ?? "cyan");
  const [imageUrl, setImageUrl] = useState(community.imageUrl ?? "");
  const [wallpaperUrl, setWallpaperUrl] = useState(community.wallpaperUrl ?? "");
  const [memberLimit, setMemberLimit] = useState(
    community.memberLimit != null ? String(community.memberLimit) : "50",
  );
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useOnValueChange(open, (isOpen) => {
    if (!isOpen) return;
    setName(community.name);
    setDescription(community.description ?? "");
    setCategory(
      (community.category as (typeof communityCategories)[number]) ?? "Anime",
    );
    setVisibility(community.visibility === "private" ? "PRIVATE" : "PUBLIC");
    setActivityLevel(community.activityLevel ?? "active");
    setAccent(community.accent ?? "cyan");
    setImageUrl(community.imageUrl ?? "");
    setWallpaperUrl(community.wallpaperUrl ?? "");
    setMemberLimit(
      community.memberLimit != null ? String(community.memberLimit) : "50",
    );
    setError(undefined);
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/communities/${community.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        category,
        visibility,
        activityLevel,
        accent,
        imageUrl: imageUrl || "",
        wallpaperUrl: wallpaperUrl || "",
        ...(visibility === "PRIVATE"
          ? { memberLimit: Number(memberLimit) || 50 }
          : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update community.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {trigger ? (
        isValidElement<{ onClick?: React.MouseEventHandler }>(trigger) ? (
          cloneElement(trigger, {
            onClick: (event: React.MouseEvent) => {
              trigger.props.onClick?.(event);
              setOpen(true);
            },
          })
        ) : (
          <span role="button" tabIndex={0} onClick={() => setOpen(true)}>
            {trigger}
          </span>
        )
      ) : (
        <GradientButton size="sm" className="gap-1.5 rounded-full px-4" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
          Edit community
        </GradientButton>
      )}

      <FormShell
        open={open}
        title="Edit community"
        description="Update community metadata, visibility, and images."
        onClose={() => setOpen(false)}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Slug" hint="Community URL cannot be changed.">
            <TextInput value={community.slug} readOnly className="opacity-70" />
          </FormField>

          <FormField label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <SelectInput value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                {communityCategories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </SelectInput>
            </FormField>
            <FormField label="Visibility">
              <SelectInput value={visibility} onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Description">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Activity level">
              <SelectInput value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as typeof activityLevel)}>
                <option value="very-active">Very Active</option>
                <option value="active">Active</option>
                <option value="moderate">Moderate</option>
                <option value="quiet">Quiet</option>
              </SelectInput>
            </FormField>
            <FormField label="Accent">
              <SelectInput value={accent} onChange={(e) => setAccent(e.target.value)}>
                {ACCENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Card image">
            <ImageUploadInput value={imageUrl} onChange={setImageUrl} />
          </FormField>

          <FormField label="Wallpaper">
            <ImageUploadInput value={wallpaperUrl} onChange={setWallpaperUrl} />
          </FormField>

          {visibility === "PRIVATE" ? (
            <>
              <FormField label="Member limit">
                <TextInput
                  type="number"
                  min={2}
                  max={500}
                  value={memberLimit}
                  onChange={(e) => setMemberLimit(e.target.value)}
                />
              </FormField>
              <CommunityJoinCodePanel
                communitySlug={community.slug}
                visibility="private"
                canManage={community.canDelete ?? false}
              />
            </>
          ) : null}

          <FormError message={error} />
          <FormActions onCancel={() => setOpen(false)} submitLabel="Save changes" loading={loading} />
        </form>
      </FormShell>
    </>
  );
}
