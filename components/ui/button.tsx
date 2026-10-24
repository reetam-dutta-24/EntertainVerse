import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button variants:
 *   primary (gradient) — the one main action in a view region
 *   secondary (outline) — glass/outline companion action
 *   ghost — low-emphasis toolbar actions
 *   destructive — delete / remove / leave
 * `gradient` and `outline` remain as aliases of primary / secondary.
 */
const primary =
  "border border-transparent bg-gradient-brand hover:border-brand-magenta hover:bg-transparent hover:[background-image:none] hover:text-white active:bg-brand-magenta/15";
const secondary = "border border-brand-magenta bg-transparent hover:bg-brand-magenta/10";

export const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-semibold text-white transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary,
        gradient: primary,
        secondary,
        outline: secondary,
        ghost: "bg-transparent text-white/90 hover:bg-white/10 hover:text-white",
        destructive: "border border-transparent bg-red-600 hover:bg-red-500",
      },
      size: {
        sm: "h-8 rounded-lg px-3.5 text-caption",
        md: "h-10 rounded-xl px-5 text-sm",
        lg: "h-11 rounded-xl px-6 text-sm",
        /** Hero CTAs only. */
        xl: "h-[52px] rounded-xl px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner over the label and disables the button — no layout shift. */
  loading?: boolean;
}

export function ButtonContent({
  loading,
  children,
}: {
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        </span>
      ) : null}
    </>
  );
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <ButtonContent loading={loading}>{children}</ButtonContent>
    </button>
  );
}
