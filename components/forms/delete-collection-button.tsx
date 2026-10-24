"use client";

import { cloneElement, isValidElement, useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Trash2 } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { FormShell } from "@/components/forms/form-shell";

interface DeleteCollectionButtonProps {
  collectionSlug: string;
  collectionName: string;
  redirectTo?: string;
  trigger?: React.ReactNode;
  onDeleted?: () => void;
}

export function DeleteCollectionButton({
  collectionSlug,
  collectionName,
  redirectTo = "/dashboard/collections",
  trigger,
  onDeleted,
}: DeleteCollectionButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/collections/${collectionSlug}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not delete collection.");
      return;
    }

    setOpen(false);
    onDeleted?.();
    router.push(redirectTo);
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      )}

      <FormShell
        open={open}
        title="Delete collection"
        description={`Permanently remove "${collectionName}" and all of its items.`}
        onClose={() => !loading && setOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/75">
            This action cannot be undone. The collection and its item links will be
            removed from your library.
          </p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <GradientButton
              size="sm"
              className="rounded-full border border-red-600 bg-red-600 px-5 hover:bg-red-500"
              disabled={loading}
              onClick={handleDelete}
            >
              {loading ? "Deleting…" : "Delete collection"}
            </GradientButton>
          </div>
        </div>
      </FormShell>
    </>
  );
}
