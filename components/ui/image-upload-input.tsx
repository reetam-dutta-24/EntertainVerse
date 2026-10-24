"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultInputClass =
  "rounded-xl border border-white/15 bg-popover px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink transition focus:border-brand-magenta/60 focus:ring-1 focus:ring-brand-magenta/30";

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Show a manual URL field below the upload button. */
  allowManualUrl?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  placeholder = "Or paste an image URL",
  inputClassName = defaultInputClass,
  disabled = false,
  allowManualUrl = true,
}: ImageUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(undefined);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Could not upload image.");
      }

      if (typeof data.url !== "string" || !data.url) {
        throw new Error("Upload succeeded but no image URL was returned.");
      }

      onChange(data.url);
    } catch (uploadError) {
      const message =
        uploadError instanceof TypeError
          ? "Network error — make sure the dev server is running, then try again."
          : uploadError instanceof Error
            ? uploadError.message
            : "Could not upload image.";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative h-32 w-full overflow-hidden rounded-xl border border-white/15 bg-white/5">
          <Image
            src={value}
            alt="Selected image preview"
            fill
            unoptimized
            className="object-cover"
          />
          <button
            type="button"
            aria-label="Remove image"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
            className="absolute end-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80 disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-brand-magenta/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading ? "Uploading…" : value ? "Change image" : "Upload image"}
      </button>

      {allowManualUrl ? (
        <input
          type="text"
          value={value}
          disabled={disabled || uploading}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(inputClassName, "w-full")}
        />
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
