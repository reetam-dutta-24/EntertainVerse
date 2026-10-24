"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/components/community/chat-message";
import { FormShell } from "@/components/forms/form-shell";
import type { CommunityChatTheme } from "@/lib/community-chat-theme";
import type { ChatMessage as ChatMessageData } from "@/types";

interface ChatMessageRowProps {
  message: ChatMessageData;
  theme?: CommunityChatTheme;
  onUpdate: (messageId: string, content: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
}

export function ChatMessageRow({
  message,
  theme,
  onUpdate,
  onDelete,
}: ChatMessageRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const showActions = message.canEdit || message.canDelete;

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    const ok = await onUpdate(message.id, draft);
    setSaving(false);
    if (ok) {
      setEditing(false);
    } else {
      setError("Could not save changes.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(undefined);
    const ok = await onDelete(message.id);
    setDeleting(false);
    if (ok) {
      setDeleteOpen(false);
    } else {
      setError("Could not delete message.");
    }
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full resize-none rounded-2xl border px-4 py-3 text-sm text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
          style={{
            borderColor: theme?.accent.border,
            background: "rgba(14,11,24,0.82)",
            color: theme?.bodyText ?? "white",
          }}
        />
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setDraft(message.content);
              setError(undefined);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            <X className="size-3.5" />
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
            style={theme?.composerButton}
          >
            <Check className="size-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex w-full items-start gap-2",
          message.own && "flex-row-reverse",
        )}
      >
        <div className="min-w-0 flex-1">
          <ChatMessage message={message} theme={theme} />
        </div>

        {showActions ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5 pt-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100",
              message.own && "flex-row-reverse",
            )}
          >
            {message.canEdit ? (
              <button
                type="button"
                title="Edit message"
                onClick={() => {
                  setDraft(message.content);
                  setEditing(true);
                  setError(undefined);
                }}
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <Pencil className="size-3.5" />
              </button>
            ) : null}
            {message.canDelete ? (
              <button
                type="button"
                title="Delete message"
                onClick={() => setDeleteOpen(true)}
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <FormShell
        open={deleteOpen}
        title="Delete message"
        description={`Remove this message from the chat?`}
        onClose={() => !deleting && setDeleteOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              ...theme?.bubbleOther,
              color: theme?.bodyText ?? "white",
            }}
          >
            {message.content.trim() ||
              (message.attachment
                ? `📎 ${message.attachment.name}`
                : "Message")}
          </p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-full border border-red-600 bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </FormShell>
    </>
  );
}
