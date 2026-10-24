"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CatalogSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  TextInput,
} from "@/components/forms/form-shell";
import { cn } from "@/lib/utils";
import { getCommunityDetailPath } from "@/lib/community-routes";
import { useToast } from "@/components/feedback/feedback-provider";

type JoinMode = "code" | "public";

export function JoinCommunityButton() {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<JoinMode>("code");
  const [joinCode, setJoinCode] = useState("");
  const [selection, setSelection] = useState<CatalogPickerSelection | null>(null);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  function resetForm() {
    setJoinCode("");
    setSelection(null);
    setError(undefined);
    setSuccess(undefined);
    setMode("code");
  }

  async function handleJoinByCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    setSuccess(undefined);

    const response = await fetch("/api/communities/join-by-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not join with that room code.");
      return;
    }

    setSuccess("You joined the private community.");
    toast("Joined community");
    setOpen(false);
    resetForm();
    if (typeof data.slug === "string") {
      router.push(getCommunityDetailPath(data.slug));
      return;
    }
    router.refresh();
  }

  async function handleJoinPublic(event: React.FormEvent) {
    event.preventDefault();
    if (!selection || selection.type !== "community") {
      setError("Search and select a public community to join.");
      return;
    }

    setLoading(true);
    setError(undefined);
    setSuccess(undefined);

    const response = await fetch(
      `/api/communities/${encodeURIComponent(selection.id)}/join`,
      { method: "POST" },
    );

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Could not join community.");
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-full border-brand-magenta px-4 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="me-1.5 size-4 text-brand-magenta" />
        Join Community
      </Button>

      <FormShell
        open={open}
        title="Join Community"
        description="Enter a private room code from an admin, or browse public communities."
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
      >
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("code");
              setError(undefined);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
              mode === "code"
                ? "bg-brand-magenta text-white shadow-glow-pink-soft"
                : "border border-brand-magenta/60 text-white/80 hover:bg-brand-magenta/10",
            )}
          >
            <KeyRound className="size-3.5" />
            Room Code
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("public");
              setError(undefined);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
              mode === "public"
                ? "bg-brand-magenta text-white shadow-glow-pink-soft"
                : "border border-brand-magenta/60 text-white/80 hover:bg-brand-magenta/10",
            )}
          >
            <Search className="size-3.5" />
            Public Browse
          </button>
        </div>

        {mode === "code" ? (
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
            <FormField
              label="Private room code"
              hint="Admins share encrypted room keys for invite-only communities."
            >
              <TextInput
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ROOM-ABC123"
                required
                autoComplete="off"
              />
            </FormField>

            <FormError message={error} />
            {success ? (
              <p className="text-center text-xs font-medium text-emerald-400">
                {success}
              </p>
            ) : null}
            <FormActions
              onCancel={() => {
                setOpen(false);
                resetForm();
              }}
              submitLabel="Join with Code"
              loading={loading}
            />
          </form>
        ) : (
          <form onSubmit={handleJoinPublic} className="flex flex-col gap-4">
            <FormField label="Search public communities">
              <CatalogSearchPicker
                allowedTypes={["community"]}
                value={selection}
                onChange={setSelection}
                placeholder="Search communities…"
              />
            </FormField>

            <FormError message={error} />
            <FormActions
              onCancel={() => {
                setOpen(false);
                resetForm();
              }}
              submitLabel="Join Community"
              loading={loading}
            />
          </form>
        )}
      </FormShell>
    </>
  );
}
