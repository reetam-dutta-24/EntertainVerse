import Image from "next/image";
import { FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityChatTheme } from "@/lib/community-chat-theme";
import type { ChatMessage as ChatMessageData } from "@/types";
import { AvatarStack } from "@/components/ui/avatar-stack";

export interface ChatMessageProps
  extends React.HTMLAttributes<HTMLDivElement> {
  message: ChatMessageData;
  theme?: CommunityChatTheme;
}

/** A single chat bubble row with accent-themed glass styling. */
export function ChatMessage({
  message,
  theme,
  className,
  ...props
}: ChatMessageProps) {
  const own = message.own ?? false;
  const hasText = message.content.trim().length > 0;

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3",
        own && "flex-row-reverse",
        className,
      )}
      {...props}
    >
      <AvatarStack users={[message.author]} size="sm" />
      <div
        className={cn(
          "flex max-w-[min(75%,28rem)] flex-col gap-1.5 rounded-2xl px-4 py-3 ring-1 ring-white/[0.04]",
          own ? "rounded-tr-lg" : "rounded-tl-lg",
        )}
        style={own ? theme?.bubbleOwn : theme?.bubbleOther}
      >
        <div
          className={cn(
            "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
            own && "flex-row-reverse",
          )}
        >
          <p
            className="text-sm font-semibold"
            style={{
              color: own ? "rgba(255,255,255,0.98)" : theme?.accentText,
              textShadow: own ? "0 1px 2px rgba(0,0,0,0.35)" : undefined,
            }}
          >
            {message.author.name}
          </p>
          {message.sentAt ? (
            <p
              className="text-caption font-medium"
              style={{ color: theme?.mutedText ?? "rgba(255,255,255,0.6)" }}
            >
              {message.sentAt}
              {message.edited ? " · edited" : ""}
            </p>
          ) : message.edited ? (
            <p
              className="text-caption font-medium italic"
              style={{ color: theme?.mutedText ?? "rgba(255,255,255,0.6)" }}
            >
              edited
            </p>
          ) : null}
        </div>

        {message.attachment?.kind === "image" ? (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block max-h-64 w-full overflow-hidden rounded-xl"
          >
            <Image
              src={message.attachment.url}
              alt={message.attachment.name}
              width={480}
              height={320}
              unoptimized
              className="h-auto max-h-64 w-full object-cover"
            />
          </a>
        ) : null}

        {message.attachment?.kind === "file" ? (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.attachment.name}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 transition hover:bg-black/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <FileText className="size-4 text-white/80" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-sm font-medium"
                style={{ color: theme?.bodyText ?? "white" }}
              >
                {message.attachment.name}
              </span>
              <span
                className="text-micro font-medium uppercase tracking-wide"
                style={{ color: theme?.mutedText ?? "rgba(255,255,255,0.6)" }}
              >
                Download file
              </span>
            </span>
            <Download className="size-4 shrink-0 text-white/60" />
          </a>
        ) : null}

        {hasText ? (
          <p
            className="text-sm leading-relaxed"
            style={{
              color: theme?.bodyText ?? "white",
              textShadow: own ? "0 1px 2px rgba(0,0,0,0.3)" : undefined,
            }}
          >
            {message.content}
          </p>
        ) : null}
      </div>
    </div>
  );
}
