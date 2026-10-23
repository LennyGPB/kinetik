"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, FileText, Play, Type } from "lucide-react";
import { AnimatedNavigation } from "./animated-navigation";
import { cn } from "@/lib/utils";
import "./motion-mode-picker.css";

const MotionModePreview = dynamic(() => import("./motion-mode-preview"), { ssr: false, loading: () => <div className="absolute inset-0 bg-surface-2" /> });

export type MotionMode = "motion" | "url" | "logo" | "pitch";

/** Visuel de la carte Pitch : une page de deck qui devient un plan vidéo. */
function PitchArt({ active }: { active: boolean }) {
  return <div className="pitch-mode-preview relative flex items-center gap-3">
    <div className={cn("relative h-28 w-20 -rotate-6 rounded-md p-2.5 shadow-[0_14px_26px_-14px_rgb(0_0_0/0.6)]", active ? "bg-white text-violet-900" : "bg-[#f5f0e8] text-[#302640]")}>
      <FileText className="size-3.5 opacity-70" />
      <span className="mt-2 block text-[7px] font-bold leading-tight">THE NEXT<br />BIG THING.</span>
      <span className="mt-1.5 block h-0.5 w-4/5 rounded bg-current opacity-25" /><span className="mt-1 block h-0.5 w-3/5 rounded bg-current opacity-25" />
      <span className="absolute inset-x-2.5 bottom-2.5 flex h-6 items-end gap-1">{[50, 75, 100].map((h) => <span key={h} className={cn("flex-1 rounded-[1px]", active ? "bg-violet-600" : "bg-[#8054c0]")} style={{ height: `${h}%` }} />)}</span>
    </div>
    <span className={cn("z-10 -mx-5 grid size-7 place-items-center rounded-full shadow-md", active ? "bg-violet-950 text-white" : "bg-fg text-bg")}><ArrowRight className="size-3.5" /></span>
    <div className={cn("relative flex h-24 w-36 rotate-3 flex-col justify-between overflow-hidden rounded-lg border p-2 shadow-[0_14px_26px_-14px_rgb(0_0_0/0.6)]", active ? "border-white/40 bg-violet-950/70" : "border-line-strong bg-[#14101f]")}>
      <span className="text-[8px] font-semibold tracking-wider text-white/70">PITCH · 60 s</span>
      <span className="grid place-items-center"><span className="grid size-8 place-items-center rounded-full bg-white text-violet-700"><Play className="ml-0.5 size-3.5" fill="currentColor" /></span></span>
      <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-[1px]", i % 2 ? "bg-violet-400" : "bg-violet-200")} />)}</span>
    </div>
  </div>;
}

export function MotionModePicker({ fr, initialMode = "motion", onContinue }: { fr: boolean; initialMode?: MotionMode; onContinue: (mode: MotionMode) => void }) {
  const [selected, setSelected] = useState<MotionMode>(initialMode);
  const reduced = useReducedMotion();
  const grid = useRef<HTMLDivElement>(null);
  const material = useRef<HTMLDivElement>(null);
  const cards = useRef<Partial<Record<MotionMode, HTMLButtonElement>>>({});
  const current = useRef(initialMode);
  const running = useRef<Animation | null>(null);
  const bounds = (mode: MotionMode) => {
    const parent = grid.current!.getBoundingClientRect();
    const card = cards.current[mode]!.getBoundingClientRect();
    return { left: card.left - parent.left, top: card.top - parent.top, width: card.width, height: card.height };
  };
  useLayoutEffect(() => {
    const place = () => {
      running.current?.cancel();
      if (!material.current || !cards.current[current.current]) return;
      const box = bounds(current.current);
      Object.assign(material.current.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: "16px", opacity: "1", filter: "none" });
    };
    place();
    let previous = grid.current!.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      const next = grid.current!.getBoundingClientRect();
      if (Math.abs(next.width - previous.width) < .5 && Math.abs(next.height - previous.height) < .5) return;
      previous = next;
      place();
    });
    observer.observe(grid.current!);
    return () => { observer.disconnect(); running.current?.cancel(); };
  }, []);
  const select = (mode: MotionMode) => {
    if (current.current === mode) return;
    const parent = grid.current!.getBoundingClientRect();
    const rect = material.current!.getBoundingClientRect();
    running.current?.cancel();
    const from = { left: rect.left - parent.left, top: rect.top - parent.top, width: rect.width, height: rect.height };
    const to = bounds(mode);
    current.current = mode;
    setSelected(mode);
    const horizontal = Math.abs(to.left - from.left) > Math.abs(to.top - from.top);
    const ribbonW = horizontal ? Math.abs(to.left - from.left) + to.width * .5 : 48;
    const ribbonH = horizontal ? 48 : Math.abs(to.top - from.top) + to.height * .5;
    const middleX = (from.left + from.width / 2 + to.left + to.width / 2) / 2;
    const middleY = (from.top + from.height / 2 + to.top + to.height / 2) / 2;
    const frames = [
      { ...from, borderRadius: 16, filter: "blur(0px)" },
      { left: from.left + from.width * .25, top: from.top + from.height * .25, width: from.width * .5, height: from.height * .5, borderRadius: 90, filter: "blur(2px)" },
      { left: middleX - ribbonW / 2, top: middleY - ribbonH / 2, width: ribbonW, height: ribbonH, borderRadius: 120, filter: "blur(5px)" },
      { left: to.left + to.width * .18, top: to.top + to.height * .18, width: to.width * .64, height: to.height * .64, borderRadius: 60, filter: "blur(1px)" },
      { ...to, borderRadius: 16, filter: "blur(0px)" },
    ].map((box, i) => ({ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, borderRadius: `${box.borderRadius}px`, filter: box.filter, offset: [0, .23, .5, .74, 1][i] }));
    // This brief, user-triggered transfer is explicitly requested even with reduced motion.
    const animation = material.current!.animate(frames, { duration: 900, easing: "cubic-bezier(.22,.8,.25,1)", fill: "forwards" });
    running.current = animation;
    animation.onfinish = () => {
      if (running.current !== animation || !material.current) return;
      Object.assign(material.current.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: "16px", filter: "none" });
      animation.cancel();
      running.current = null;
    };
  };
  const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 27, mass: .85 };
  return <div className="mx-auto max-w-4xl py-5 sm:py-10">
    <h1 className="text-2xl font-semibold sm:text-3xl">{fr ? "Quel motion veux-tu créer ?" : "What motion will you create?"}</h1>
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{fr ? "Une vidéo pour présenter ton produit, une signature animée autour de ton texte, ou ton pitch deck en vidéo." : "Start from your website or create manually. You can also animate a signature or turn your pitch deck into a video."}</p>
      <div ref={grid} role="group" aria-label={fr ? "Type de motion" : "Motion type"} className="relative isolate mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div ref={material} aria-hidden className="pointer-events-none absolute z-10 overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] opacity-0 shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_24px_65px_-24px_rgb(139_92_246/0.75)]">
          <span className="absolute -top-20 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.24),transparent)]"/>
        </div>
        {(["url", "motion", "logo", "pitch"] as const).map((mode) => {
          const active = mode === selected;
          return <button ref={(element) => { if (element) cards.current[mode] = element; }} key={mode} type="button" aria-pressed={active} onClick={() => select(mode)} className={cn("motion-mode-card group relative flex min-w-0 flex-col rounded-2xl border bg-surface text-left transition-[border-color,color,box-shadow] duration-300 ease-out hover:shadow-[0_14px_40px_-14px_rgb(139_92_246/0.55),0_5px_16px_-8px_rgb(167_139_250/0.35)] focus-visible:shadow-[0_14px_40px_-14px_rgb(139_92_246/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent motion-reduce:transition-none", active ? "border-transparent text-white" : "border-line text-fg hover:border-violet-400/50")}>
            <div aria-hidden className="relative z-20 flex h-44 w-full items-center justify-center overflow-hidden rounded-t-2xl sm:h-48">
              <motion.div initial={false} animate={{ scale: active ? 1.06 : .94, y: active ? -2 : 2 }} transition={spring} className="absolute inset-0 flex items-center justify-center">
                {mode === "url" || mode === "motion" ? <video src={mode === "url" ? "/medias/stage-landscape-en.mp4" : "/medias/orbit-3d-landscape-en.mp4"} autoPlay loop muted playsInline preload="metadata" tabIndex={-1} className="pointer-events-none h-full w-full object-cover" /> : mode === "pitch" ? <PitchArt active={active} /> : <MotionModePreview templateId="logo-neon-stack" fr={fr} />}
              </motion.div>
              <span className={cn("absolute right-4 top-4 grid size-6 place-items-center rounded-full border", active ? "border-white bg-white text-violet-700" : "border-line-strong")}>
                {active && <motion.span initial={false} animate={{ scale: 1 }} transition={spring}><Check className="size-3.5" strokeWidth={3}/></motion.span>}
              </span>
            </div>
            <div className={cn("relative z-20 flex w-full flex-1 flex-col border-t p-5 sm:p-6", active ? "border-white/15" : "border-line")}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold">{mode === "logo" && <Type className={cn("size-4", active ? "text-violet-100" : "text-accent-text")}/ >}{mode === "url" ? (fr ? "URL vers vidéo" : "URL to video") : mode === "motion" ? (fr ? "Créer manuellement" : "Create manually") : mode === "pitch" ? "Pitch deck to video" : "Signature"}</h2></div>
              <p className={cn("mt-2 text-sm leading-relaxed", active ? "text-violet-100" : "text-muted")}>{mode === "url" ? (fr ? "Colle ton lien, valide ta marque et choisis parmi trois vidéos. Tu ajustes ensuite dans le même éditeur." : "Paste your link, review your brand and choose from three videos. Fine-tune in the same editor.") : mode === "motion" ? fr ? "Le parcours habituel : screens, logo, textes, musique et montage complet." : "The familiar flow: screenshots, logo, text, music and a complete edit." : mode === "pitch" ? fr ? "Un PDF ou un site devient un motion de 30 secondes à 2 minutes, avec ta marque et ta narration." : "Turn a PDF or website into a 30-second to 2-minute motion, with your brand and narration." : fr ? "Écris un mot ou ton nom. Choisis une animation : elle s’adapte à ton texte." : "Type a word or your name. Pick an animation and it adapts to your text."}</p>
            </div>
          </button>;
        })}
      </div>
    <div className="mt-7"><AnimatedNavigation first onValidate={() => true} onContinue={() => onContinue(selected)} onBack={() => {}} disabledNext={false} pending={false}>{fr ? "Continuer" : "Continue"}<ArrowRight/></AnimatedNavigation></div>
  </div>;
}
