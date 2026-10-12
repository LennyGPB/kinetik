import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 place-items-center overflow-hidden rounded-[10px] bg-accent-gradient shadow-[0_4px_16px_-4px_var(--accent-glow)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[62%] text-white" fill="none">
        <path d="M6 4v16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M18 4 9.5 12 18 20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
      </svg>
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-bold tracking-[-0.04em]">Kinetik</span>
    </span>
  );
}
