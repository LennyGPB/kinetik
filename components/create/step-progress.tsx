"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fil des étapes d'un formulaire de création : barre segmentée sur mobile, pastilles reliées sur desktop.
 * Les étapes déjà atteintes (jusqu'à `furthest`) restent cliquables.
 */
export function StepProgress({ label, steps, step, furthest, disabled = false, onSelect, counter }: {
  label: string;
  steps: { label: string; icon: LucideIcon }[];
  step: number;
  furthest: number;
  disabled?: boolean;
  onSelect: (step: number) => void;
  /** Texte « Étape 2 sur 6 » affiché sur mobile */
  counter: string;
}) {
  const total = steps.length;
  return <nav aria-label={label} className="mb-8 sm:mb-10">
    {/* Mobile */}
    <div className="sm:hidden">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-fg">{steps[step]?.label}</span>
        <span className="tabular-nums text-muted">{counter}</span>
      </div>
      <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden>
        {steps.map((item, index) => <span key={item.label} className={cn("h-1 rounded-full transition-colors", index <= step ? "bg-accent" : "bg-surface-3")} />)}
      </div>
    </div>

    {/* Desktop */}
    <ol className="hidden items-center sm:flex">{steps.map(({ label: name, icon: Icon }, index) => {
      const active = step === index, complete = index < step, reachable = index <= furthest && !disabled;
      return <li key={name} className={cn("flex min-w-0 items-center", index < total - 1 && "flex-1")}>
        <button
          type="button"
          disabled={!reachable}
          onClick={() => onSelect(index)}
          aria-label={`${index + 1}. ${name}`}
          aria-current={active ? "step" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default",
            active ? "bg-accent-soft font-semibold text-accent-text" : complete ? "text-fg enabled:hover:bg-surface-2" : "text-muted enabled:hover:bg-surface-2",
          )}
        >
          <span className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border transition-colors",
            active ? "border-accent bg-accent text-accent-fg shadow-[0_0_0_4px_rgb(139_92_246/0.15)]" : complete ? "border-accent/50 bg-accent-soft text-accent-text" : "border-line-strong bg-surface text-muted",
          )} aria-hidden>
            {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
          </span>
          <span className="whitespace-nowrap max-md:sr-only">{name}</span>
        </button>
        {index < total - 1 && <span aria-hidden className={cn("mx-2 h-px min-w-3 flex-1 transition-colors", complete ? "bg-accent/60" : "bg-line-strong")} />}
      </li>;
    })}</ol>
  </nav>;
}
