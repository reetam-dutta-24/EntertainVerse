"use client";

import { RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";

export interface FormResetButtonProps {
  /** Create forms clear to empty; edit forms go back to the last saved version. */
  mode: "create" | "edit";
  onReset: () => void;
  disabled?: boolean;
  className?: string;
}

/** "Clear form" / "Reset changes" for the admin CMS forms — always asks first. */
export function FormResetButton({ mode, onReset, disabled, className }: FormResetButtonProps) {
  const confirmAction = useConfirm();

  async function handleClick() {
    const confirmed = await confirmAction(
      mode === "create"
        ? {
            title: "Clear the whole form?",
            description: "Every field goes back to empty and the draft saved in this browser is deleted. This can't be undone.",
            confirmLabel: "Clear form",
            destructive: true,
          }
        : {
            title: "Discard your changes?",
            description: "The form goes back to the last saved version and the draft saved in this browser is deleted. Nothing changes on the site until you save.",
            confirmLabel: "Discard changes",
            destructive: true,
          },
    );
    if (confirmed) onReset();
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 transition-colors hover:border-red-300/40 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <RotateCcw className="size-4" aria-hidden />
      {mode === "create" ? "Clear form" : "Reset changes"}
    </button>
  );
}
