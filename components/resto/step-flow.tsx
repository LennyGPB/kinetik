"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RestoCopy } from "@/lib/resto/copy";
import type { VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";
import { RestoPreview } from "./resto-preview";

/**
 * Parcours de création Resto en étapes courtes : progression en haut, une étape à la fois (avec glissement),
 * aperçu à côté (en tête sur téléphone) et navigation fixée en bas, à portée de pouce.
 */
export function StepFlow({ copy, title, step, steps, intros, direction, preview, previewFrom = 1, children, error, nav }: {
  copy: RestoCopy; title: string; step: number; steps: string[]; intros: string[]; direction: number;
  preview: VideoProps | null;
  /** Première étape où l'aperçu apparaît */
  previewFrom?: number;
  children: ReactNode; error?: string; nav: ReactNode;
}) {
  const showPreview = step >= previewFrom && Boolean(preview);
  return (
    <div className={cn("mx-auto grid max-w-6xl gap-6 pb-28 lg:gap-10", showPreview && "lg:grid-cols-[minmax(0,1fr)_380px]")}>
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
            <span>{title}</span>
            <span>{copy.stepOf.replace("{n}", String(step + 1)).replace("{total}", String(steps.length))}</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden>
            {steps.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-surface-2")} />)}
          </div>
          <div className="mt-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{steps[step]}</h1>
            <p className="mt-1.5 text-muted">{intros[step]}</p>
          </div>
        </header>
        {showPreview && <div className="lg:hidden"><RestoPreview videoProps={preview!} label={copy.preview} compact /></div>}
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section key={step} custom={direction} initial={{ opacity: 0, x: direction * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -24 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
            {children}
          </motion.section>
        </AnimatePresence>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      {showPreview && (
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
          <p className="mb-3 text-sm font-semibold">{copy.preview}</p>
          <RestoPreview videoProps={preview!} label={copy.preview} />
        </aside>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">{nav}</div>
      </nav>
    </div>
  );
}

/** Boutons Retour / Continuer (ou Créer à la dernière étape). */
export function StepNav({ copy, step, last, ready, busy, creating, skip, createLabel, onBack, onNext, onCreate }: {
  copy: RestoCopy; step: number; last: boolean; ready: boolean; busy: boolean; creating: boolean;
  /** Étape facultative laissée vide : « Passer » au lieu de « Continuer » */
  skip?: boolean;
  createLabel: string; onBack: () => void; onNext: () => void; onCreate: () => void;
}) {
  return <>
    {step > 0 && <Button variant="outline" size="lg" disabled={busy} onClick={onBack} aria-label={copy.previous}><ArrowLeft /><span className="hidden sm:inline">{copy.previous}</span></Button>}
    <div className="flex flex-1 flex-col items-end gap-1">
      {last
        ? <Button variant="purple" size="lg" className="w-full sm:w-auto" loading={creating} disabled={!ready || busy} onClick={onCreate}>{createLabel}</Button>
        : <Button variant={skip ? "outline" : "purple"} size="lg" className="w-full sm:w-auto" disabled={!ready || busy} onClick={onNext}>{skip ? copy.skip : copy.next}<ArrowRight /></Button>}
      {last && <span className="text-xs text-muted">{copy.free}</span>}
    </div>
  </>;
}
