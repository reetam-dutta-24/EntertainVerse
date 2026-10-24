"use client";

import { Children, cloneElement, isValidElement, useEffect } from "react";
import { useIsClient } from "@/hooks/use-prop-sync";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormShellProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FormShell({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: FormShellProps) {
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12091f] shadow-2xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-white/60">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/55">
        {label}
      </span>
      {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
      {children}
    </label>
  );
}

const inputClass =
  "rounded-xl border border-white/15 bg-[#1a0f2e] px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-brand-magenta/60 focus:ring-1 focus:ring-brand-magenta/30";

const selectClass =
  "w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-[#1a0f2e] bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat px-3 py-2.5 pe-10 text-sm text-white outline-none transition focus:border-brand-magenta/60 focus:ring-1 focus:ring-brand-magenta/30 [color-scheme:dark]";

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

const optionClass = "bg-[#1a0f2e] text-white";

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return <Field label={label} hint={hint}>{children}</Field>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-24 resize-y", props.className)} />;
}

export function SelectInput({
  children,
  className,
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const styledChildren = Children.map(children, (child) => {
    if (!isValidElement<{ className?: string }>(child) || child.type !== "option") {
      return child;
    }
    return cloneElement(child, {
      className: cn(optionClass, child.props.className),
    });
  });

  return (
    <select
      {...props}
      className={cn(selectClass, className)}
      style={{ backgroundImage: selectChevron, ...style }}
    >
      {styledChildren}
    </select>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function FormNotice({
  message,
  variant = "info",
}: {
  message?: string;
  variant?: "info" | "success" | "warning";
}) {
  if (!message) return null;
  const styles = {
    info: "border-white/15 bg-white/5 text-white/75",
    success: "border-green-500/30 bg-green-500/10 text-green-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm",
        styles[variant],
      )}
      role="alert"
    >
      {message}
    </p>
  );
}

export function FormTagMultiSelect({
  label,
  hint,
  values,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  options: readonly { value: string; label: string }[];
  onChange: (values: string[]) => void;
}) {
  const available = options.filter((option) => !values.includes(option.value));

  return (
    <FormField label={label} hint={hint}>
      <div className="flex flex-col gap-2">
        <SelectInput
          value=""
          onChange={(event) => {
            const value = event.target.value;
            if (value && !values.includes(value)) {
              onChange([...values, value]);
            }
          }}
        >
          <option value="">Add a genre…</option>
          {available.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const option = options.find((entry) => entry.value === value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange(values.filter((entry) => entry !== value))}
                  className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-500/20"
                >
                  {option?.label ?? value} ×
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </FormField>
  );
}

export function FormActions({
  onCancel,
  submitLabel,
  loading,
}: {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-gradient-to-r from-brand-magenta to-brand-purple px-5 py-2 text-sm font-semibold text-white shadow-glow-pink-soft transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
