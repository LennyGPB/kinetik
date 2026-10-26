"use client";


import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { purpleButtonStyle } from "./button";

/** Contrôle segmenté avec pastille animée (filtres, onglets, toggles). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
  variant = "segmented",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
  variant?: "segmented" | "pills";
}) {
  const layoutId = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("relative inline-flex max-w-full min-w-0 items-center overflow-x-auto scrollbar-none", variant === "pills" ? "gap-2 px-1 py-1.5" : "gap-1 rounded-full border border-line bg-surface-2/70 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative min-h-9 shrink-0 whitespace-nowrap rounded-full font-medium transition-colors disabled:opacity-40",
              variant === "pills" ? (size === "sm" ? "px-3.5 py-1.5 text-[13px]" : "px-4 py-2 text-sm") : (size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"),
              variant === "pills" && "border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              variant === "pills" ? (active ? "border-transparent text-white" : "border-line text-muted hover:border-line-strong hover:text-fg") : (active ? "text-fg" : "text-muted hover:text-fg"),
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={cn("absolute inset-0 rounded-full", variant === "pills" ? purpleButtonStyle : "border border-line-strong bg-surface shadow-[var(--shadow-soft)]")}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
