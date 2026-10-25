import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonContent, buttonVariants } from "@/components/ui/button";

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<VariantProps<typeof buttonVariants>, "size"> {
  /** Shows a spinner over the label and disables the button — no layout shift. */
  loading?: boolean;
}

/** The EntertainVerse primary CTA: brand magenta-to-purple gradient. Max one per view region. */
export function GradientButton({
  className,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: GradientButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant: "primary", size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <ButtonContent loading={loading}>{children}</ButtonContent>
    </button>
  );
}
