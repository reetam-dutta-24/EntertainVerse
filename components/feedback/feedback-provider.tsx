"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useIsClient } from "@/hooks/use-prop-sync";
import { cn } from "@/lib/utils";

/**
 * App-wide feedback: toasts for action results and an accessible confirm
 * dialog that replaces window.confirm. Mounted once in <Providers>.
 */

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button. */
  destructive?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const TOAST_MS = 3200;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      {pending ? <ConfirmDialog options={pending} onSettle={settle} /> : null}
    </FeedbackContext.Provider>
  );
}

function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useToast/useConfirm must be used inside <FeedbackProvider>.");
  return context;
}

/** `toast("Added to watchlist")`, `toast("Could not save", "error")`. */
export function useToast() {
  return useFeedback().toast;
}

/** `if (!(await confirm({ title, description, destructive: true }))) return;` */
export function useConfirm() {
  return useFeedback().confirm;
}

const toneStyles: Record<ToastTone, { icon: typeof CircleCheck; className: string }> = {
  success: { icon: CircleCheck, className: "border-brand-magenta/40 text-brand-pink" },
  error: { icon: CircleAlert, className: "border-red-400/50 text-red-300" },
  info: { icon: Info, className: "border-white/20 text-white/80" },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  const mounted = useIsClient();
  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[300] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((item) => {
        const { icon: Icon, className } = toneStyles[item.tone];
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border bg-popover-deep/95 px-4 py-3 shadow-card-lift backdrop-blur-md",
              className,
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-medium text-white">{item.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              aria-label="Dismiss notification"
              className="-m-2 shrink-0 cursor-pointer rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function ConfirmDialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions;
  onSettle: (value: boolean) => void;
}) {
  const mounted = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Safer default: focus Cancel, not the destructive action.
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSettle(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onSettle]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onSettle(false)}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-white/10 bg-popover-deep p-6 shadow-card-lift"
      >
        <div className="flex items-start gap-3">
          {options.destructive ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="text-lg font-bold text-white">
              {options.title}
            </h2>
            <p id={descriptionId} className="text-sm text-white/70">
              {options.description}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onSettle(false)}
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => onSettle(true)}
            className={cn(
              "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto",
              options.destructive ? "bg-red-600" : "bg-gradient-brand",
            )}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
