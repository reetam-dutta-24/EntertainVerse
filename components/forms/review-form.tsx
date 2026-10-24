"use client";

import { useState } from "react";
import { useOnValueChange } from "@/hooks/use-prop-sync";
import { useAppRouter } from "@/hooks/use-app-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  FormActions,
  FormError,
  FormField,
  FormShell,
  TextArea,
  TextInput,
} from "@/components/forms/form-shell";
import { reviewApiPath } from "@/lib/review-routes";
import type { ReviewTargetType } from "@/lib/review-routes";
import type { Review } from "@/types";

interface ReviewFormValues {
  rating: string;
  headline: string;
  body: string;
}

function emptyValues(): ReviewFormValues {
  return { rating: "8", headline: "", body: "" };
}

function valuesFromReview(review: Review): ReviewFormValues {
  return {
    rating: String(review.rating),
    headline: review.headline ?? "",
    body: review.content,
  };
}

interface ReviewFormShellProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  initialValues?: ReviewFormValues;
  onClose: () => void;
  onSubmit: (values: ReviewFormValues) => Promise<string | undefined>;
}

function ReviewFormShell({
  open,
  title,
  description,
  submitLabel,
  initialValues,
  onClose,
  onSubmit,
}: ReviewFormShellProps) {
  const [values, setValues] = useState<ReviewFormValues>(
    initialValues ?? emptyValues(),
  );
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useOnValueChange(open, (isOpen) => {
    if (!isOpen) return;
    setValues(initialValues ?? emptyValues());
    setError(undefined);
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    const message = await onSubmit(values);
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  }

  return (
    <FormShell
      open={open}
      title={title}
      description={description}
      onClose={() => !loading && onClose()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Rating" hint="Out of 10">
          <TextInput
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={values.rating}
            onChange={(event) =>
              setValues((current) => ({ ...current, rating: event.target.value }))
            }
            required
          />
        </FormField>

        <FormField label="Headline" hint="Optional pull quote">
          <TextInput
            value={values.headline}
            onChange={(event) =>
              setValues((current) => ({ ...current, headline: event.target.value }))
            }
            placeholder="A short hook for your review"
            maxLength={200}
          />
        </FormField>

        <FormField label="Review" hint="Required">
          <TextArea
            value={values.body}
            onChange={(event) =>
              setValues((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="Share what you loved, what surprised you, and who should watch or listen."
            required
            maxLength={5000}
          />
        </FormField>

        <FormError message={error} />
        <FormActions
          onCancel={onClose}
          submitLabel={submitLabel}
          loading={loading}
        />
      </form>
    </FormShell>
  );
}

interface AddReviewButtonProps {
  targetType: ReviewTargetType;
  targetSlug: string;
  onCreated: (review: Review) => void;
}

export function AddReviewButton({
  targetType,
  targetSlug,
  onCreated,
}: AddReviewButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ReviewFormValues) {
    const response = await fetch(reviewApiPath(targetType, targetSlug), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: Number(values.rating),
        headline: values.headline,
        body: values.body,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return (data.error as string | undefined) ?? "Could not publish review.";
    }
    onCreated(data.review as Review);
    router.refresh();
    return undefined;
  }

  return (
    <>
      <GradientButton
        size="sm"
        className="gap-1.5 rounded-full px-5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Add Review
      </GradientButton>

      <ReviewFormShell
        open={open}
        title="Write a Review"
        description="Share your take with the AniVerse community."
        submitLabel="Publish review"
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

interface EditReviewButtonProps {
  review: Review;
  trigger?: "button" | "icon";
  onUpdated: (review: Review) => void;
}

export function EditReviewButton({
  review,
  trigger = "button",
  onUpdated,
}: EditReviewButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ReviewFormValues) {
    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: Number(values.rating),
        headline: values.headline,
        body: values.body,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return (data.error as string | undefined) ?? "Could not update review.";
    }
    onUpdated(data.review as Review);
    router.refresh();
    return undefined;
  }

  return (
    <>
      {trigger === "icon" ? (
        <button
          type="button"
          aria-label="Edit review"
          onClick={() => setOpen(true)}
          className="text-white/60 transition-colors hover:text-white"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <GradientButton
          size="sm"
          className="gap-1.5 rounded-full px-5"
          onClick={() => setOpen(true)}
        >
          <Pencil className="size-4" />
          Edit Your Review
        </GradientButton>
      )}

      <ReviewFormShell
        open={open}
        title="Edit review"
        description="Update your rating or review text."
        submitLabel="Save changes"
        initialValues={valuesFromReview(review)}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

interface DeleteReviewButtonProps {
  review: Review;
  onDeleted: (reviewId: string) => void;
}

export function DeleteReviewButton({
  review,
  onDeleted,
}: DeleteReviewButtonProps) {
  const router = useAppRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setLoading(true);
    setError(undefined);

    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError((data.error as string | undefined) ?? "Could not delete review.");
      return;
    }

    onDeleted(review.id);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete review"
        onClick={() => setOpen(true)}
        className="text-white/60 transition-colors hover:text-red-300"
      >
        <Trash2 className="size-3.5" />
      </button>

      <FormShell
        open={open}
        title="Delete review"
        description="This permanently removes your review from the carousel."
        onClose={() => !loading && setOpen(false)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/75">
            {review.headline
              ? `Delete "${review.headline}"?`
              : "Delete this review?"}
          </p>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleDelete()}
              className="rounded-full border border-red-600 bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </FormShell>
    </>
  );
}
