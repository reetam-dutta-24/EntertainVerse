"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Plus } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  CatalogMultiSearchPicker,
  type CatalogPickerSelection,
} from "@/components/forms/catalog-search-picker";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  SelectInput,
} from "@/components/forms/form-shell";

export function AddWatchlistButton() {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [selections, setSelections] = useState<CatalogPickerSelection[]>([]);
  const [priority, setPriority] = useState<"NORMAL" | "HIGH">("NORMAL");
  const [status, setStatus] = useState<
    "PENDING" | "WATCHING" | "COMPLETED" | "DROPPED"
  >("PENDING");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setSlugs([]);
    setSelections([]);
    setPriority("NORMAL");
    setStatus("PENDING");
    setError(undefined);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const contentItems = selections.filter((item) => item.type === "content");
    if (contentItems.length === 0) {
      setError("Search and select at least one show, movie, or anime to add.");
      return;
    }

    setLoading(true);
    setError(undefined);

    const failures: string[] = [];

    for (const selection of contentItems) {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentSlug: selection.id,
          priority,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        failures.push(
          typeof data.error === "string"
            ? `${selection.title}: ${data.error}`
            : selection.title,
        );
      }
    }

    setLoading(false);

    if (failures.length === contentItems.length) {
      setError(failures[0] ?? "Could not add to watchlist.");
      return;
    }

    if (failures.length > 0) {
      setError(`Some items could not be added: ${failures.join("; ")}`);
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  const submitLabel =
    selections.length > 1
      ? `Add ${selections.length} to Watchlist`
      : "Add to watchlist";

  return (
    <>
      <GradientButton
        size="sm"
        className="w-full rounded-full px-4 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <Plus className="me-1.5 size-4" />
        Add to watchlist
      </GradientButton>

      <FormShell
        open={open}
        title="Add to watchlist"
        description="Search and pick multiple titles — keep searching to add more before submitting."
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField label="Search & add items">
            <CatalogMultiSearchPicker
              allowedTypes={["content"]}
              values={slugs}
              onChange={setSlugs}
              onSelectionsChange={setSelections}
              placeholder="Search anime, movies, shows…"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priority">
              <SelectInput
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as "NORMAL" | "HIGH")
                }
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
              </SelectInput>
            </FormField>
            <FormField label="Status">
              <SelectInput
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | "PENDING"
                      | "WATCHING"
                      | "COMPLETED"
                      | "DROPPED",
                  )
                }
              >
                <option value="PENDING">Pending</option>
                <option value="WATCHING">Watching</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </SelectInput>
            </FormField>
          </div>

          <FormError message={error} />
          <FormActions
            onCancel={() => {
              setOpen(false);
              resetForm();
            }}
            submitLabel={submitLabel}
            loading={loading}
          />
        </form>
      </FormShell>
    </>
  );
}
