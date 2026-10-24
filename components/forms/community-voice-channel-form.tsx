"use client";
import { useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  TextInput,
} from "@/components/forms/form-shell";
import type { VoiceChannel } from "@/types";

interface CreateVoiceChannelButtonProps {
  communitySlug: string;
}

export function CreateVoiceChannelButton({
  communitySlug,
}: CreateVoiceChannelButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [memberLimit, setMemberLimit] = useState("10");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/voice-channels`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          memberLimit: Number(memberLimit),
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create voice channel.");
      return;
    }

    setOpen(false);
    setTitle("");
    setMemberLimit("10");
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
        Create voice channel
      </GradientButton>

      <FormShell
        open={open}
        title="Create voice channel"
        description="Set a channel title and member limit."
        onClose={() => !loading && setOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Channel title" hint="Required">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Late Night Anime Talk"
              required
              maxLength={120}
            />
          </FormField>
          <FormField label="Member limit" hint="2–100 members">
            <TextInput
              type="number"
              min={2}
              max={100}
              value={memberLimit}
              onChange={(event) => setMemberLimit(event.target.value)}
              required
            />
          </FormField>
          <FormError message={error} />
          <FormActions
            onCancel={() => setOpen(false)}
            submitLabel="Create channel"
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}

interface VoiceChannelActionsProps {
  communitySlug: string;
  channel: VoiceChannel;
}

export function VoiceChannelActions({
  communitySlug,
  channel,
}: VoiceChannelActionsProps) {
  const router = useAppRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(channel.title);
  const [memberLimit, setMemberLimit] = useState(String(channel.memberLimit ?? 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useOnValueChange(channel, (next) => {
    setTitle(next.title);
    setMemberLimit(String(next.memberLimit ?? 10));
  });

  async function handleJoinToggle() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/voice-channels/${channel.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: channel.viewerJoined ? "leave" : "join",
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update membership.");
      return;
    }

    router.refresh();
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/voice-channels/${channel.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          memberLimit: Number(memberLimit),
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not update channel.");
      return;
    }

    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/voice-channels/${channel.id}`,
      { method: "DELETE" },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not delete channel.");
      return;
    }

    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {/* Audio rooms aren't built yet: joining is disabled, leaving still works. */}
      <GradientButton
        size="sm"
        className="rounded-full px-5"
        disabled={loading || !channel.viewerJoined}
        onClick={() => void handleJoinToggle()}
        title={channel.viewerJoined ? undefined : "Voice chat is coming soon"}
      >
        {channel.viewerJoined ? "Leave VC" : "Voice soon"}
      </GradientButton>
      {channel.canEdit ? (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit ${channel.title}`}
          className="rounded-full border border-white/20 p-2.5 text-white/70 hover:text-white"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}
      {channel.canDelete ? (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete ${channel.title}`}
          className="rounded-full border border-white/20 p-2.5 text-white/70 hover:text-red-300"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {error ? <p className="w-full text-xs text-red-400">{error}</p> : null}

      <FormShell
        open={editOpen}
        title="Edit voice channel"
        onClose={() => !loading && setEditOpen(false)}
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <FormField label="Channel title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required />
          </FormField>
          <FormField label="Member limit">
            <TextInput
              type="number"
              min={2}
              max={100}
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
              required
            />
          </FormField>
          <FormError message={error} />
          <FormActions onCancel={() => setEditOpen(false)} submitLabel="Save" loading={loading} />
        </form>
      </FormShell>

      <FormShell
        open={deleteOpen}
        title="Delete voice channel"
        description={`Delete "${channel.title}"?`}
        onClose={() => !loading && setDeleteOpen(false)}
        className="max-w-md"
      >
        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-full border border-red-600 bg-red-600 px-5 py-2 text-sm text-white"
          >
            Delete
          </button>
        </div>
      </FormShell>
    </div>
  );
}
