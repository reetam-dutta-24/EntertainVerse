"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  TextInput,
} from "@/components/forms/form-shell";
import type { SearchResult } from "@/lib/search/types";
import type { WatchParty } from "@/types";

interface CreateWatchChannelButtonProps {
  communitySlug: string;
}

function filterMediaResults(results: SearchResult[]) {
  return results.filter((result) => result.type === "content" || result.type === "song");
}

export function CreateWatchChannelButton({
  communitySlug,
}: CreateWatchChannelButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [memberLimit, setMemberLimit] = useState("20");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchedResults, setResults] = useState<SearchResult[]>([]);
  const results = searchQuery.trim().length >= 2 ? fetchedResults : [];
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const query = searchQuery.trim();
    if (query.length < 2) return;

    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Search failed.");
          return response.json() as Promise<{ results: SearchResult[] }>;
        })
        .then((data) => setResults(filterMediaResults(data.results)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, searchQuery]);

  const selectedLabel = useMemo(() => {
    if (!selected) return null;
    return selected.subtitle ? `${selected.title} — ${selected.subtitle}` : selected.title;
  }, [selected]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Select content or music for the watch channel.");
      return;
    }

    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/watch-channels`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          memberLimit: Number(memberLimit),
          ...(selected.type === "song"
            ? { trackSlug: selected.id }
            : { contentSlug: selected.id }),
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not create watch channel.");
      return;
    }

    setOpen(false);
    setTitle("");
    setMemberLimit("20");
    setSearchQuery("");
    setSelected(null);
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
        Create Watch Channel
      </GradientButton>

      <FormShell
        open={open}
        title="Create Watch Channel"
        description="Pick what to watch and set a member limit."
        onClose={() => !loading && setOpen(false)}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Channel title" hint="Required">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Weekend Movie Night"
              required
              maxLength={120}
            />
          </FormField>

          <FormField label="Search content or music" hint="Type at least 2 characters">
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#1a0f2e] px-3 py-2.5">
              <Search className="size-4 shrink-0 text-white/45" />
              <TextInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search titles…"
                className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 focus:ring-0"
              />
            </label>
          </FormField>

          {selected ? (
            <p className="rounded-xl border border-brand-magenta/40 bg-brand-magenta/10 px-3 py-2 text-sm text-white/85">
              Selected: {selectedLabel}
            </p>
          ) : null}

          {searching ? (
            <p className="text-sm text-white/55">Searching…</p>
          ) : results.length > 0 ? (
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => setSelected(result)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                      selected?.id === result.id && selected.type === result.type
                        ? "border-brand-magenta/60 bg-brand-magenta/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <span className="size-10 shrink-0 overflow-hidden rounded-md bg-black/40">
                      {result.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={result.imageUrl} alt="" className="size-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs capitalize text-white/55">
                        {result.subtitle ?? result.type}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : searchQuery.trim().length >= 2 ? (
            <p className="text-sm text-white/55">No matches found.</p>
          ) : null}

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
            submitLabel="Create Channel"
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}

interface WatchChannelActionsProps {
  communitySlug: string;
  channel: WatchParty;
}

export function WatchChannelActions({
  communitySlug,
  channel,
}: WatchChannelActionsProps) {
  const router = useAppRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(channel.title);
  const [memberLimit, setMemberLimit] = useState(String(channel.memberLimit ?? 20));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useOnValueChange(channel, (next) => {
    setTitle(next.title);
    setMemberLimit(String(next.memberLimit ?? 20));
  });

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/watch-channels/${channel.id}`,
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

  async function handleJoinToggle() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/watch-channels/${channel.id}`,
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

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(
      `/api/communities/${communitySlug}/watch-channels/${channel.id}`,
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

  const isFull =
    !channel.viewerJoined &&
    (channel.viewerCount ?? 0) >= (channel.memberLimit ?? 0);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col">
      <GradientButton
        size="sm"
        className="rounded-full px-5"
        disabled={loading || isFull}
        onClick={() => void handleJoinToggle()}
      >
        {channel.viewerJoined ? "Leave" : isFull ? "Full" : "Join"}
      </GradientButton>
      {channel.canEdit ? (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-full border border-white/20 p-2 text-white/70 hover:text-white"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}
      {channel.canDelete ? (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-full border border-white/20 p-2 text-white/70 hover:text-red-300"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {error ? <p className="w-full text-xs text-red-400">{error}</p> : null}

      <FormShell
        open={editOpen}
        title="Edit Watch Channel"
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
        title="Delete Watch Channel"
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
