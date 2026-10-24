"use client";

import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon: LucideIcon;
  type?: "text" | "email" | "password";
}

/** Outlined auth field with a leading icon and password visibility toggle. */
export function AuthInput({
  icon: Icon,
  type = "text",
  className,
  ...props
}: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/5 px-3.5 transition-colors focus-within:border-brand-magenta",
        className,
      )}
    >
      <Icon className="size-4 shrink-0 text-muted/80" />
      <input
        type={isPassword && !visible ? "password" : "text"}
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-muted/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
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
  );
}
