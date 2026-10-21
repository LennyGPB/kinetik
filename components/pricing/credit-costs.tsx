"use client";

import { motion, useReducedMotion } from "motion/react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { CREDIT_COSTS, getExportCost, getPostGenerationCost, getStoreGenerationCost } from "@/config/credits";
import { postCopy } from "@/lib/posts/copy";

import { cn } from "@/lib/utils";

function CostGraphic({ kind }: { kind: string }) {

  return (
    <span aria-hidden="true" className="relative flex h-7 w-8 shrink-0 items-center justify-center text-fg">
      {kind === "type" ? (
        <span className="font-heading text-lg font-extralight tracking-tight">{"Aa"}<span className="text-accent-text">.</span></span>
      ) : kind === "chat" ? (
        <span className="relative flex h-5 w-7 -rotate-6 flex-col justify-center gap-1 border border-fg/40 px-1 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-0">
          <span className="h-px w-4 bg-fg/60" /><span className="h-px w-2 bg-fg/30" />
          <span className="absolute -right-px -bottom-1 h-3 w-px bg-accent-text" />
        </span>
      ) : (
        <span className="relative flex h-6 w-8 -rotate-6 items-end rounded-sm border border-fg/40 px-1 pb-0.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-0">
          <span className="absolute top-1 left-1 h-px w-2 bg-accent-text" />
          <span className="font-mono text-[9px] leading-none">{kind === "long" ? "30s+" : "MP4"}</span>
        </span>
      )}
    </span>
  );
}

/** `reveal` : les lignes glissent une à une et leur prix apparaît à l'arrivée dans la vue (landing). */
export function CreditCosts({ className, reveal = false, includePosts = false }: { className?: string; reveal?: boolean; includePosts?: boolean }) {
  const t = useDictionary();
  const reduceMotion = useReducedMotion();
  // Les états initiaux ne dépendent jamais de useReducedMotion (null au rendu serveur) : sinon l'hydratation garde
  // les éléments invisibles. Animations réduites → même révélation, mais instantanée.
  const ease = [0.16, 1, 0.3, 1] as const;

  const c = t.landing.pricing.costs;
  const fr = t.locale === "fr";
  const ROWS = [
  { graphic: "type", label: c.generation, cost: CREDIT_COSTS.generation },
  { graphic: "chat", label: c.edit, cost: CREDIT_COSTS.edit },
  { graphic: "mp4", label: c.exportShort, cost: CREDIT_COSTS.export.short },
  { graphic: "long", label: c.exportLong, cost: CREDIT_COSTS.export.long },
  { graphic: "mp4", label: fr ? `Export template 3D (Stage) · jusqu’à ${CREDIT_COSTS.export.shortMaxSeconds} s` : `3D template export (Stage) · up to ${CREDIT_COSTS.export.shortMaxSeconds}s`, cost: getExportCost({ duration: CREDIT_COSTS.export.shortMaxSeconds, premium3d: true }) },
  ...(includePosts ? [
    { graphic: "type", label: `${postCopy(t.locale).posts} · ${postCopy(t.locale).generationCost} (1 ${postCopy(t.locale).image.toLowerCase()})`, cost: getPostGenerationCost(1) },
    { graphic: "type", label: `${postCopy(t.locale).generationCost} · 5 ${postCopy(t.locale).pages.toLowerCase()}`, cost: getPostGenerationCost(5) },
    { graphic: "chat", label: postCopy(t.locale).ai, cost: CREDIT_COSTS.post.edit },
    { graphic: "mp4", label: `${postCopy(t.locale).exportCost} / ${postCopy(t.locale).image.toLowerCase()}`, cost: CREDIT_COSTS.post.exportPerImage },
    // Les autres produits payants, pour que la liste couvre tout ce qui consomme des crédits
    { graphic: "type", label: fr ? "Signature animée" : "Animated signature", cost: CREDIT_COSTS.generation },
    { graphic: "type", label: fr ? "Captures App Store & Play · 1 page" : "App Store & Play screenshots · 1 page", cost: getStoreGenerationCost(1) },
    { graphic: "mp4", label: fr ? "Export captures stores / page" : "Store screenshots export / page", cost: CREDIT_COSTS.store.exportPerPage },
    { graphic: "type", label: fr ? "Pitch deck · analyse du document" : "Pitch deck · document analysis", cost: CREDIT_COSTS.pitch.analysis },
    { graphic: "type", label: fr ? "Pitch deck · création du motion" : "Pitch deck · motion creation", cost: CREDIT_COSTS.pitch.creation },
    { graphic: "chat", label: fr ? `Voix off · par scène, par tranche de ${CREDIT_COSTS.voiceover.perCharacters} caractères` : `Voiceover · per scene, per ${CREDIT_COSTS.voiceover.perCharacters} characters`, cost: CREDIT_COSTS.voiceover.perUnit },
    { graphic: "mp4", label: fr ? "Démo d’écran · import" : "Screen demo · import", cost: CREDIT_COSTS.recordingImport },
    { graphic: "type", label: fr ? "Décors · déblocage de l’aperçu" : "Scenes · unlock preview", cost: CREDIT_COSTS.decor.preview },
    { graphic: "mp4", label: fr ? `Décors · export jusqu’à ${CREDIT_COSTS.export.shortMaxSeconds} s` : `Scenes · export up to ${CREDIT_COSTS.export.shortMaxSeconds}s`, cost: CREDIT_COSTS.decor.exportShort },
    { graphic: "long", label: fr ? `Décors · export au-delà de ${CREDIT_COSTS.export.shortMaxSeconds} s` : `Scenes · export above ${CREDIT_COSTS.export.shortMaxSeconds}s`, cost: CREDIT_COSTS.decor.exportLong },
    { graphic: "chat", label: fr ? "Traduction FR ↔ EN" : "Translation FR ↔ EN", cost: CREDIT_COSTS.translation },
  ] : []),
];

  return (
    <ul className={cn("divide-y divide-line rounded-2xl border border-line bg-bg-subtle", className)}>
      {ROWS.map(({ graphic, label, cost }, index) => (
        <motion.li
          key={label}
          className="group flex items-center gap-3 px-5 py-3.5"
          initial={reveal ? { opacity: 0, x: 32, filter: "blur(6px)" } : false}
          whileInView={reveal ? { opacity: 1, x: 0, filter: "blur(0px)" } : undefined}
          viewport={{ once: true, amount: 0.6 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, delay: 0.2 + index * 0.12, ease }}
        >
          <CostGraphic kind={graphic} />
          <span className="flex-1 text-[15px] text-muted">{label}</span>
          <motion.span
            className="font-mono text-sm font-semibold"
            initial={reveal ? { opacity: 0, scale: 0.6 } : false}
            whileInView={reveal ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true, amount: 0.6 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16, delay: 0.45 + index * 0.12 }}
          >
            {cost} <span className="font-sans font-normal text-subtle">{cost > 1 ? t.common.credits : t.common.credit}</span>
          </motion.span>
        </motion.li>
      ))}
    </ul>
  );
}
