"use client";

import { Check, Globe, LayoutTemplate, MessageSquare, Palette, Sparkles } from "lucide-react";
import { urlFlowCopy } from "@/lib/url-video/flow-copy";
import { cn } from "@/lib/utils";

const icons = [Globe, LayoutTemplate, MessageSquare, Palette, Sparkles];

export function UrlStepNavigation({ locale, step, furthest, disabled, onSelect }: {
  locale: "fr" | "en"; step: number; furthest: number; disabled: boolean; onSelect: (step: number) => void;
}) {
  const f = urlFlowCopy[locale];
  return <nav aria-label={locale === "fr" ? "Étapes de création" : "Creation steps"} className="mb-9 rounded-2xl border border-line bg-surface p-2 sm:mb-10 sm:p-3">
    <div className="flex items-center justify-between px-3 pb-3 pt-2 text-xs sm:hidden"><span className="font-medium text-fg">{f.steps[step]}</span><span className="tabular-nums text-muted">{f.step} {step + 1} {f.of} {f.steps.length}</span></div>
    <ol className="grid grid-cols-5 gap-1 sm:gap-2">{f.steps.map((label, index) => {
      const Icon = icons[index], active = step === index, complete = index < step;
      return <li key={label} className="min-w-0">
        <button type="button" disabled={index > furthest || disabled} onClick={() => onSelect(index)} aria-label={`${index + 1}. ${label}`} aria-current={active ? "step" : undefined} className={cn("relative flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-2 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default sm:justify-start sm:px-3", active ? "bg-accent-soft text-accent-text" : complete ? "text-fg enabled:hover:bg-surface-2" : "text-muted enabled:hover:bg-surface-2")}>
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", active ? "bg-accent text-accent-fg" : complete ? "bg-accent-soft text-accent-text" : "bg-surface-2")} aria-hidden>{complete ? <Check className="size-4" /> : <Icon className="size-4" />}</span>
          <span className={cn("hidden text-xs leading-snug sm:block", active && "font-semibold")}>{label}</span>
          {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
        </button>
      </li>;
    })}</ol>
  </nav>;
}
