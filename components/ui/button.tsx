import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap font-semibold text-white transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink focus-visible:ring-2 focus-visible:ring-brand-magenta focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary — on hover morphs to secondary outline style (no glow)
        gradient:
          "border border-transparent bg-gradient-brand hover:border-brand-magenta hover:bg-transparent hover:[background-image:none] hover:text-white active:bg-brand-magenta/15",
        outline:
          "border border-brand-magenta bg-transparent hover:bg-brand-magenta/10",
        ghost: "bg-transparent text-white/90 hover:bg-white/10 hover:text-white",
      },
      size: {
        sm: "h-8 rounded-lg px-3.5 text-xs",
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
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
