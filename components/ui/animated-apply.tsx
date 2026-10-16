"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Attente d'une action longue (ex. traduction) : le bouton recule et revient se cogner au bout du rail, en boucle (s) */
const KNOCK = 0.85;
/** Recul (px) avant chaque nouveau coup */
const KNOCK_BACK = 26;

/** Glissade du bouton (s) et courbe partagées par le bouton et sa traînée */
const SLIDE = 0.38;
const EASE = [0.45, 0, 0.15, 1] as const;
/** Pause après l'impact, pour que le flash soit visible avant que l'action (souvent la fermeture du dialog) ne parte */
const IMPACT_PAUSE_MS = 140;
/** Étincelles : décalage vertical (px), moment d'apparition dans la glissade (0 → 1), taille (px). Fixes : rendu stable. */
const SPARKS = [
  { y: -13, at: 0.15, size: 4 }, { y: 11, at: 0.25, size: 3 }, { y: -5, at: 0.38, size: 5 },
  { y: 15, at: 0.5, size: 3 }, { y: -17, at: 0.62, size: 4 }, { y: 5, at: 0.74, size: 3 }, { y: -9, at: 0.86, size: 4 },
];
/** Lignes de vitesse derrière le bouton : position verticale, longueur, retard */
const STREAKS = [
  { top: "28%", width: "55%", delay: 0.04, strong: false }, { top: "46%", width: "85%", delay: 0, strong: true },
  { top: "58%", width: "65%", delay: 0.08, strong: false }, { top: "74%", width: "40%", delay: 0.12, strong: false },
];

/** Lignes de vitesse façon manga, sur toute la largeur du rail : position verticale, longueur, épaisseur, retard. */
const SPEED_LINES = [
  { top: 14, length: 38, thick: false, delay: 0 }, { top: 22, length: 55, thick: true, delay: 0.05 }, { top: 30, length: 30, thick: false, delay: 0.1 },
  { top: 40, length: 62, thick: true, delay: 0.02 }, { top: 50, length: 44, thick: false, delay: 0.14 }, { top: 58, length: 70, thick: true, delay: 0.07 },
  { top: 68, length: 34, thick: false, delay: 0.12 }, { top: 78, length: 50, thick: true, delay: 0.03 }, { top: 86, length: 28, thick: false, delay: 0.16 },
];
/** Images fantômes du bouton (flou de mouvement) : retard sur le bouton et opacité */
const GHOSTS = [{ lag: 0.035, opacity: 0.45 }, { lag: 0.07, opacity: 0.28 }, { lag: 0.105, opacity: 0.15 }];

/** Ce qui dit la vitesse : copies floues du bouton qui le suivent en décalé, et lignes qui filent vers l'arrière. */
function Speed({ travel, buttonWidth }: { travel: number; buttonWidth: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {SPEED_LINES.map((line) => (
        <motion.span
          key={line.top}
          className={cn("absolute rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent", line.thick ? "h-0.5" : "h-px")}
          style={{ top: `${line.top}%`, width: `${line.length}%`, left: "100%" }}
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: "-260%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.42, delay: line.delay, ease: "easeIn" }}
        />
      ))}
      {GHOSTS.map((ghost) => (
        <motion.span
          key={ghost.lag}
          className="absolute top-1.5 left-1.5 h-10 rounded-full bg-accent blur-[3px]"
          style={{ width: buttonWidth }}
          initial={{ x: 0, opacity: 0, scaleX: 1 }}
          animate={{ x: travel, opacity: [0, ghost.opacity, ghost.opacity, 0], scaleX: [1, 1.25, 1] }}
          transition={{ x: { duration: SLIDE, delay: ghost.lag, ease: EASE }, opacity: { duration: SLIDE + ghost.lag + 0.12, times: [0, 0.2, 0.75, 1] }, scaleX: { duration: SLIDE, delay: ghost.lag } }}
        />
      ))}
    </div>
  );
}

/** Traînée lumineuse laissée par le bouton : halo flou, cœur dégradé, lignes de vitesse, étincelles et flash d'impact. */
function Trail({ width }: { width: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Halo */}
      <motion.div
        className="absolute inset-y-1 left-1.5 rounded-full bg-accent blur-md"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width, opacity: [0, 0.85, 0.6, 0] }}
        transition={{ width: { duration: SLIDE, ease: EASE }, opacity: { duration: 0.95, times: [0, 0.25, 0.6, 1] } }}
      />
      {/* Cœur de la traînée, de plus en plus lumineux vers le bouton */}
      <motion.div
        className="absolute inset-y-2.5 left-1.5 overflow-hidden rounded-full bg-gradient-to-r from-transparent via-accent/70 to-white/90"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width, opacity: [0, 1, 1, 0] }}
        transition={{ width: { duration: SLIDE, ease: EASE }, opacity: { duration: 0.95, times: [0, 0.15, 0.55, 1] } }}
      >
        {STREAKS.map((streak) => (
          <motion.span
            key={streak.top}
            className={cn("absolute right-0 origin-right rounded-full bg-gradient-to-r from-transparent", streak.strong ? "h-0.5 to-white" : "h-px to-white/70")}
            style={{ top: streak.top, width: streak.width }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1.15], opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: streak.delay, ease: "easeOut" }}
          />
        ))}
      </motion.div>
      {/* Étincelles projetées derrière le bouton */}
      {SPARKS.map((spark) => (
        <motion.span
          key={spark.at}
          className="absolute top-1/2 rounded-full bg-white shadow-[0_0_8px_2px_var(--accent-glow)]"
          style={{ left: 6 + width * spark.at, width: spark.size, height: spark.size, marginTop: -spark.size / 2 }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: [0, 1, 0], x: -26, y: spark.y, scale: 0.3 }}
          transition={{ duration: 0.55, delay: SLIDE * spark.at, ease: "easeOut" }}
        />
      ))}
      {/* Flash d'impact à l'arrivée */}
      <motion.span
        className="absolute top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-sm"
        style={{ left: 6 + width }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.45, delay: SLIDE - 0.04, ease: "easeOut" }}
      />
      <motion.span
        className="absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
        style={{ left: 6 + width }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.3, 3], opacity: [1, 0] }}
        transition={{ duration: 0.55, delay: SLIDE, ease: "easeOut" }}
      />
    </div>
  );
}

/** Petit flash et onde à chaque coup du bouton contre le bout du rail, calés sur KNOCK. */
function Knock({ left }: { left: number }) {
  const loop = { duration: KNOCK, repeat: Infinity, ease: "easeOut" } as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.span
        className="absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-sm"
        style={{ left }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.3, 1.6], opacity: [0, 0, 0.8, 0] }}
        transition={{ ...loop, times: [0, 0.97, 0.985, 1] }}
      />
      <motion.span
        className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent"
        style={{ left }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0.3, 0.3, 2.4], opacity: [0, 1, 0] }}
        transition={{ ...loop, times: [0, 0.01, 0.45] }}
      />
    </div>
  );
}

/** Shared confirmation rail: only commits once the button reaches its destination. */
export function AnimatedApply({ disabled, onApply, onCancel, onBegin, onApplyingChange, submit = false, label, icon }: {
  disabled?: boolean;
  onApply: () => void | Promise<void>;
  onCancel: () => void;
  onBegin?: () => void;
  onApplyingChange?: (applying: boolean) => void;
  submit?: boolean;
  /** Texte du bouton (défaut : « Appliquer ») et icône à sa suite (défaut : flèche) */
  label?: ReactNode;
  icon?: ReactNode;
}) {
  const t = useDictionary();

  const track = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const committed = useRef(false);
  const [travel, setTravel] = useState<number | null>(null);
  const [trailWidth, setTrailWidth] = useState(0);
  const [buttonWidth, setButtonWidth] = useState(0);
  // Action lancée mais pas encore terminée (promesse en cours) : le bouton « frappe » au bout du rail
  const [waiting, setWaiting] = useState(false);
  const applying = travel !== null;
  const reduceMotion = useReducedMotion();
  // Le libellé peut s'allonger pendant l'action (« Traduction en cours… ») : le bouton reste calé contre le bout du rail
  useEffect(() => {
    if (!applying || !button.current || !track.current) return;
    const fit = () => setTravel(Math.max(0, (track.current?.clientWidth ?? 0) - (button.current?.offsetWidth ?? 0) - 12));
    const observer = new ResizeObserver(fit);
    observer.observe(button.current);
    return () => observer.disconnect();
  }, [applying]);
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const result = onApply();
    if (result) setWaiting(true);
    if (result) void result.finally(() => {
      committed.current = false;
      setWaiting(false);
      setTravel(null);
      setTrailWidth(0);
      onApplyingChange?.(false);
    }).catch(() => undefined);
  };
  return (
    <div ref={track} className="relative flex min-h-12 items-center justify-between overflow-hidden rounded-full border border-line bg-bg p-1.5">
      {applying && !reduceMotion && <Trail width={trailWidth} />}
      {applying && !waiting && !reduceMotion && <Speed travel={travel} buttonWidth={buttonWidth} />}
      {waiting && travel !== null && !reduceMotion && <Knock left={travel + 6 + buttonWidth} />}
      <motion.div
        ref={button}
        className="relative z-10 inline-flex origin-right"
        initial={false}
        animate={waiting && travel !== null && !reduceMotion
          // Recule doucement, puis revient vite se cogner (écrasé un instant contre le bout)
          ? { x: [travel, travel - KNOCK_BACK, travel], scaleX: [1, 1, 1, 0.92, 1], y: 0, rotate: [0, 0, -0.6, 0.6, 0] }
          : { x: travel ?? 0, scaleX: applying ? [1, 1.1, 1] : 1, y: applying ? [0, -1, 1, -1.5, 1.5, -1, 0] : 0, rotate: applying ? [0, -0.5, 0.5, -0.7, 0.7, -0.3, 0] : 0 }}
        transition={waiting
          ? { duration: KNOCK, repeat: Infinity, x: { duration: KNOCK, repeat: Infinity, times: [0, 0.6, 1], ease: ["easeOut", "easeIn"] }, scaleX: { duration: KNOCK, repeat: Infinity, times: [0, 0.6, 0.98, 0.99, 1] }, rotate: { duration: KNOCK, repeat: Infinity, times: [0, 0.97, 0.98, 0.99, 1] } }
          : { duration: SLIDE, ease: EASE, y: { duration: SLIDE, ease: "linear" }, rotate: { duration: SLIDE, ease: "linear" } }}
        onAnimationComplete={() => { if (applying && !waiting) setTimeout(commit, reduceMotion ? 0 : IMPACT_PAUSE_MS); }}
      >
        <button type={submit ? "submit" : "button"} disabled={disabled || applying} onClick={(event) => {
          event.preventDefault();
          if (disabled || applying || committed.current) return;
          onBegin?.();
          const distance = Math.max(0, (track.current?.clientWidth ?? 0) - (button.current?.offsetWidth ?? 0) - 12);
          if (distance < 1) return commit();
          onApplyingChange?.(true);
          setTrailWidth(distance + (button.current?.offsetWidth ?? 0) / 2);
          setButtonWidth(button.current?.offsetWidth ?? 0);
          setTravel(distance);
        }} className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-fg transition-shadow duration-300 disabled:cursor-not-allowed", applying ? "shadow-[0_0_28px_6px_var(--accent-glow)]" : "disabled:opacity-40")}>
          {label ?? t.app.editor.timeline.apply} {icon ?? <ArrowRight className="size-4" aria-hidden />}
        </button>
      </motion.div>
      <button type="button" disabled={applying} onClick={onCancel} className={cn("h-10 cursor-pointer rounded-full border border-line-strong bg-black px-4 text-sm font-medium text-white transition-colors hover:border-accent hover:bg-accent", applying && "invisible")}>
        {t.app.editor.timeline.cancel}
      </button>
    </div>
  );
}
