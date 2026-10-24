"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAT_ANY_ACCEPT,
  CHAT_FILE_ACCEPT,
  CHAT_FOLDER_MAX_FILES,
  CHAT_IMAGE_ACCEPT,
  CHAT_QUICK_ACTIONS,
  type ChatAttachment,
  type ChatQuickAction,
} from "@/lib/chat-emojis";
import type { CommunityChatTheme } from "@/lib/community-chat-theme";

export interface ChatSendPayload {
  content: string;
  attachment?: ChatAttachment;
}

export interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (payload: ChatSendPayload) => void;
  theme?: CommunityChatTheme;
  className?: string;
}

async function uploadChatFile(file: File): Promise<ChatAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "chat");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not upload file.",
    );
  }

  if (
    typeof data.url !== "string" ||
    typeof data.name !== "string" ||
    (data.kind !== "image" && data.kind !== "file")
  ) {
    throw new Error("Upload succeeded but attachment data was invalid.");
  }

  return {
    url: data.url,
    name: data.name,
    kind: data.kind,
  };
}

/** Message composer with file/image/folder attachments and quick emojis. */
export function ChatInput({
  placeholder = "Send a message...",
  disabled = false,
  onSend,
  theme,
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<ChatAttachment>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const canSend = Boolean(value.trim() || attachment);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || disabled || uploading) return;

    onSend?.({
      content: value.trim(),
      attachment,
    });
    setValue("");
    setAttachment(undefined);
    setError(undefined);
  }

  function insertEmoji(emoji: string) {
    if (disabled || uploading) return;
    setValue((current) => `${current}${emoji}`);
  }

  async function handleFiles(
    files: FileList | File[] | null | undefined,
    options?: { multiple?: boolean },
  ) {
    if (!files?.length || disabled || uploading) return;

    const list = Array.from(files).slice(
      0,
      options?.multiple ? CHAT_FOLDER_MAX_FILES : 1,
    );

    setUploading(true);
    setError(undefined);

    try {
      if (options?.multiple && list.length > 1) {
        for (const file of list) {
          const uploaded = await uploadChatFile(file);
          onSend?.({ content: value.trim(), attachment: uploaded });
        }
        setValue("");
        setAttachment(undefined);
        return;
      }

      const uploaded = await uploadChatFile(list[0]);
      setAttachment(uploaded);
    } catch (uploadError) {
      const message =
        uploadError instanceof TypeError
          ? "Network error — make sure the dev server is running, then try again."
          : uploadError instanceof Error
            ? uploadError.message
            : "Could not upload file.";
      setError(message);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  }

  function handleQuickAction(action: ChatQuickAction, emoji: string) {
    if (disabled || uploading) return;

    switch (action) {
      case "image":
        imageInputRef.current?.click();
        break;
      case "folder":
        folderInputRef.current?.click();
        break;
      case "file":
        fileInputRef.current?.click();
        break;
      case "attachment":
        attachInputRef.current?.click();
        break;
      case "emoji":
        insertEmoji(emoji);
        break;
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={imageInputRef}
        type="file"
        accept={CHAT_IMAGE_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={CHAT_FILE_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept={CHAT_ANY_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        multiple
        {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(event) =>
          void handleFiles(event.target.files, { multiple: true })
        }
      />
      <input
        ref={attachInputRef}
        type="file"
        accept={CHAT_ANY_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-center gap-1">
        {CHAT_QUICK_ACTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.label}
            disabled={disabled || uploading}
            onClick={() => handleQuickAction(item.action, item.emoji)}
            className="rounded-lg px-2 py-1 text-base transition hover:bg-white/10 disabled:opacity-40"
            style={{
              border: `1px solid ${theme?.accent.border ?? "rgba(255,255,255,0.12)"}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span role="img" aria-label={item.label}>
              {item.emoji}
            </span>
          </button>
        ))}
        {uploading ? (
          <span className="inline-flex items-center gap-1 px-2 text-xs text-white/60">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading…
          </span>
        ) : null}
      </div>

      {attachment ? (
        <div
          className="flex items-center gap-3 rounded-2xl px-3 py-2"
          style={{
            border: `1px solid ${theme?.accent.border ?? "rgba(255,255,255,0.12)"}`,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {attachment.kind === "image" ? (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={attachment.url}
                alt={attachment.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <span className="text-xl" aria-hidden>
              📄
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium"
              style={{ color: theme?.bodyText ?? "white" }}
            >
              {attachment.name}
            </p>
            <p
              className="text-micro font-medium uppercase tracking-wide"
              style={{ color: theme?.mutedText ?? "rgba(255,255,255,0.6)" }}
            >
              {attachment.kind === "image" ? "Image attached" : "File attached"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Remove attachment"
            disabled={disabled || uploading}
            onClick={() => setAttachment(undefined)}
            className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs font-medium text-red-300">{error}</p> : null}

      <form
        onSubmit={submit}
        className="flex h-14 w-full items-center gap-3 rounded-2xl px-4"
        style={theme?.composer}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || uploading}
          className="h-full flex-1 bg-transparent text-sm font-medium placeholder:text-white/55 focus:outline-none"
          style={{
            color: theme?.bodyText ?? "white",
          }}
        />
        <button
          type="submit"
          disabled={disabled || uploading || !canSend}
          aria-label="Send message"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-all hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-40"
          style={theme?.composerButton}
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  );
}
