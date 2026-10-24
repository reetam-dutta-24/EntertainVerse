"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon: LucideIcon;
  type?: "text" | "email" | "password";
  /** Inline validation message shown under the field. */
  error?: string;
}

/** Outlined auth field with a leading icon and password visibility toggle. */
export function AuthInput({
  icon: Icon,
  type = "text",
  className,
  error,
  ...props
}: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const errorId = useId();

  return (
    <div className="flex w-full flex-col gap-1.5">
    <div
      className={cn(
        "flex h-11 w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/5 px-3.5 transition-colors focus-within:border-brand-magenta",
        error && "border-red-400/70",
        className,
      )}
    >
      <Icon className="size-4 shrink-0 text-muted/80" />
      <input
        type={isPassword && !visible ? "password" : "text"}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-muted/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
        // Placeholder-only fields still need an accessible name.
        aria-label={props["aria-label"] ?? props.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {isPassword ? (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="cursor-pointer text-muted/80 transition-colors hover:text-white"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ) : null}
    </div>
    {error ? (
      <p id={errorId} className="px-1 text-caption text-red-300">
        {error}
      </p>
    ) : null}
    </div>
  );
}
