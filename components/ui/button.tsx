import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong",
  purple: "border border-violet-300/60 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.18),transparent_70%),linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] font-semibold text-white shadow-[inset_0_1px_1px_rgb(255_255_255/0.3),0_8px_24px_-8px_rgb(139_92_246/0.65)] hover:border-violet-200/90 hover:shadow-[inset_0_1px_1px_rgb(255_255_255/0.4),0_10px_28px_-8px_rgb(139_92_246/0.85)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400",
  secondary: "bg-fg text-bg hover:opacity-90",
  outline: "border border-line-strong bg-surface/50 text-fg hover:border-fg/30 hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  soft: "bg-accent-soft text-accent-text hover:bg-accent/20",
  danger: "bg-danger text-white hover:brightness-110",
} as const;

const sizes = {
  sm: "h-8 rounded-full px-3.5 text-[13px]",
  md: "h-10 rounded-full px-5 text-sm",
  lg: "h-12 rounded-full px-7 text-[15px]",
  icon: "size-9 rounded-full",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {

  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
