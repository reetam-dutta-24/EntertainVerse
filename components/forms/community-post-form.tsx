"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { ImageUploadInput } from "@/components/ui/image-upload-input";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  TextInput,
} from "@/components/forms/form-shell";
import type { CommunityPost } from "@/types";

type PostKind = "POST" | "ANNOUNCEMENT";

interface CommunityPostFormButtonProps {
  communitySlug: string;
  kind?: PostKind;
  triggerLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  submitLabel?: string;
}

export function CommunityPostFormButton({
  communitySlug,
  kind = "POST",
  triggerLabel = kind === "ANNOUNCEMENT" ? "Post announcement" : "Create post",
  dialogTitle = kind === "ANNOUNCEMENT" ? "Post announcement" : "Create post",
  dialogDescription =
    kind === "ANNOUNCEMENT"
      ? "Share an official announcement with the community."
      : "Share an update with the community.",
  submitLabel = kind === "ANNOUNCEMENT" ? "Publish announcement" : "Publish post",
}: CommunityPostFormButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/communities/${communitySlug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        imageUrl,
        kind,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create post.");
      return;
    }

    setOpen(false);
    setTitle("");
    setImageUrl("");
    router.refresh();
  }

  return (
    <>
      <GradientButton
        size="sm"
        className="h-8 gap-1 rounded-full px-4 text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" />
        {triggerLabel}
      </GradientButton>

      <FormShell
        open={open}
        title={dialogTitle}
        description={dialogDescription}
        onClose={() => !loading && setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Post title" hint="Required">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your post a title"
              required
              maxLength={200}
            />
          </FormField>

          <FormField label="Post image" hint="Required">
            <ImageUploadInput
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="Upload or paste an image URL"
            />
          </FormField>

          <FormError message={error} />
          <FormActions
            onCancel={() => setOpen(false)}
            submitLabel={submitLabel}
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}

export function CreateCommunityPostButton({
  communitySlug,
}: {
  communitySlug: string;
}) {
  return <CommunityPostFormButton communitySlug={communitySlug} kind="POST" />;
}

export function CreateAnnouncementButton({
  communitySlug,
}: {
  communitySlug: string;
}) {
  return (
    <CommunityPostFormButton
      communitySlug={communitySlug}
      kind="ANNOUNCEMENT"
      triggerLabel="Post announcement"
    />
  );
}

interface EditCommunityPostButtonProps {
  communitySlug: string;
  post: CommunityPost;
}

export function EditCommunityPostButton({
  communitySlug,
  post,
}: EditCommunityPostButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [imageUrl, setImageUrl] = useState(post.imageUrl ?? "");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/posts/${post.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, imageUrl: imageUrl || undefined }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update post.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Edit post"
        onClick={() => setOpen(true)}
        className="text-white/60 transition-colors hover:text-white"
      >
        <Pencil className="size-3" />
      </button>

      <FormShell
        open={open}
        title="Edit post"
        description="Update the post title or image."
        onClose={() => !loading && setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Post title">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
            />
          </FormField>
          <FormField label="Post image">
            <ImageUploadInput value={imageUrl} onChange={setImageUrl} />
          </FormField>
          <FormError message={error} />
          <FormActions
            onCancel={() => setOpen(false)}
            submitLabel="Save changes"
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}

interface DeleteCommunityPostButtonProps {
  communitySlug: string;
  post: CommunityPost;
}

export function DeleteCommunityPostButton({
  communitySlug,
  post,
}: DeleteCommunityPostButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/posts/${post.id}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not delete post.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete post"
        onClick={() => setOpen(true)}
        className="text-white/60 transition-colors hover:text-red-300"
      >
        <Trash2 className="size-3" />
      </button>

      <FormShell
        open={open}
        title="Delete post"
        description={`Do you want to delete "${post.title}"?`}
        onClose={() => !loading && setOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/75">
            This permanently removes the post from the community feed.
          </p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleDelete()}
              className="rounded-full border border-red-600 bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </FormShell>
    </>
  );
}
