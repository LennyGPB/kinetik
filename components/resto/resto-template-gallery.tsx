"use client";

import { useMemo, useState } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { getRestoStyle, getRestoTemplate, type RestoStyleId } from "@/config/resto-templates";
import type { RestoContent } from "@/lib/resto/content";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions } from "@/remotion/props";
import { restoVideoProps } from "./resto-form";
import { restoExample, restoExamplePhotos } from "./resto-examples";

/** Exemples montrés dans la galerie : un template dans un style (typographie seule, restaurant fictif). */
const EXAMPLES: { template: RestoContent["template"]; style: RestoStyleId; kind: string }[] = [
  // Le style Street en premier
  { template: "plat-du-jour", style: "street", kind: "dish" },
  { template: "menu-semaine", style: "street", kind: "week" },
  { template: "happy-hour", style: "street", kind: "happyhour" },
  { template: "evenement", style: "street", kind: "event" },
  { template: "formule-midi", style: "chic", kind: "lunch" },
  { template: "plat-du-jour", style: "bistrot", kind: "dish" },
  { template: "avis", style: "bistrot", kind: "reviews" },
  { template: "menu-semaine", style: "chic", kind: "week" },
  { template: "horaires", style: "bistrot", kind: "hours" },
  { template: "formule-midi", style: "bistrot", kind: "lunch" },
  { template: "presentation", style: "chic", kind: "intro" },
  { template: "plat-du-jour", style: "chic", kind: "dish" },
  { template: "happy-hour", style: "bistrot", kind: "happyhour" },
];

function ExampleCard({ template, style, href, playing, onPlay }: { template: RestoContent["template"]; style: RestoStyleId; href: string; playing: boolean; onPlay: (on: boolean) => void }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const props = useMemo(() => restoVideoProps({ ...restoExample(template, locale, style), language: locale }, restoExamplePhotos(template), null), [template, style, locale]);
  const { width, height } = videoDimensions(props);
  const frames = durationInFrames(props.graph);
  const common = { component: KinetikVideo, inputProps: props, durationInFrames: frames, fps: FPS, compositionWidth: width, compositionHeight: height, style: { width: "100%", height: "100%" } };
  return (
    <Link href={href} onMouseEnter={() => onPlay(true)} onMouseLeave={() => onPlay(false)} onFocus={() => onPlay(true)} onBlur={() => onPlay(false)}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-black transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-[0_20px_50px_-20px_var(--accent-glow)] sm:rounded-3xl">
      <div className="transition-transform duration-700 group-hover:scale-[1.04]" style={{ aspectRatio: `${width} / ${height}` }}>
        {playing ? <Player {...common} autoPlay loop initiallyMuted acknowledgeRemotionLicense /> : <Thumbnail {...common} frameToDisplay={Math.round(frames * (template === "formule-midi" || template === "plat-du-jour" ? 0.9 : 0.45))} />}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-white sm:text-lg">{getRestoTemplate(template)!.name[locale]}</p>
            <p className="mt-0.5 text-xs text-white/70">{getRestoStyle(style)!.name}</p>
          </div>
          <span className="grid size-8 shrink-0 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight className="size-4" /></span>
        </div>
      </div>
      <span className="absolute top-2.5 left-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur sm:top-3 sm:left-3">Restaurants</span>
    </Link>
  );
}

/**
 * Templates Resto, pour la galerie de la home (liens vers /restaurants) et la page Templates (liens vers la création).
 * Une image de la vidéo au repos, la vidéo au survol. Le plat du jour utilise la photo d'exemple de l'éditeur.
 */
export function RestoTemplateGallery({ linkTo, expanded = true, className }: { linkTo: "landing" | "create"; expanded?: boolean; className?: string }) {
  const [playing, setPlaying] = useState<number | null>(null);
  const href = (kind: string) => (linkTo === "landing" ? "/restaurants" : `/create?kind=${kind}`);
  const items = expanded ? EXAMPLES : EXAMPLES.slice(0, 5);
  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className={className ?? "columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4"}>
      {items.map((example, i) => (
        <motion.div key={`${example.template}-${example.style}`} className="mb-3 break-inside-avoid sm:mb-4"
          variants={{ hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}>
          <ExampleCard template={example.template} style={example.style} href={href(example.kind)} playing={playing === i} onPlay={(on) => setPlaying((current) => (on ? i : current === i ? null : current))} />
        </motion.div>
      ))}
    </motion.div>
  );
}
