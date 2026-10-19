"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";


const EASE = [0.16, 1, 0.3, 1] as const;

function AnimatedWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
          >
            {word}
            {" "}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

const ROTATE_MS = 1700;
/** Same slide curve as the apply buttons: a fast launch that brakes hard into the stop. */
const DASH = [0.45, 0, 0.15, 1] as const;
const SLIDE = 0.38;
/** Leaving: accelerates off to the right. */
const LAUNCH = [0.55, 0, 1, 0.45] as const;
/** Motion-blur copies trailing the phrase: delay behind it and opacity. */
const GHOSTS = [{ lag: 0.035, opacity: 0.45 }, { lag: 0.07, opacity: 0.28 }, { lag: 0.105, opacity: 0.15 }];
/** Speed lines streaking backwards on every swap: vertical position (%), length (%), thickness, delay. */
const SPEED_LINES = [
  { top: 12, length: 30, thick: false, delay: 0 }, { top: 26, length: 48, thick: true, delay: 0.05 }, { top: 40, length: 62, thick: true, delay: 0.02 },
  { top: 54, length: 38, thick: false, delay: 0.1 }, { top: 66, length: 70, thick: true, delay: 0.07 }, { top: 80, length: 34, thick: false, delay: 0.12 }, { top: 92, length: 26, thick: false, delay: 0.15 },
];

const PHRASE: Variants = {
  from: { x: "-120%", scaleX: 1.25, filter: "blur(8px)", opacity: 0 },
  at: {
    x: "0%", scaleX: [1.25, 1.25, 0.94, 1], filter: "blur(0px)", opacity: 1,
    // Small knock when it lands, like the apply button hitting the end of its rail.
    y: [0, 0, -3, 3, -2, 0], rotate: [0, 0, -0.8, 0.8, -0.4, 0],
    transition: { x: { duration: SLIDE, ease: DASH }, scaleX: { duration: SLIDE + 0.12, times: [0, 0.7, 0.85, 1] }, filter: { duration: SLIDE }, opacity: { duration: 0.08 }, y: { duration: SLIDE + 0.2, times: [0, 0.62, 0.72, 0.82, 0.92, 1] }, rotate: { duration: SLIDE + 0.2, times: [0, 0.62, 0.72, 0.82, 0.92, 1] } },
  },
  to: { x: "130%", scaleX: 1.25, filter: "blur(8px)", opacity: [1, 1, 0], transition: { duration: 0.3, ease: LAUNCH } },
};
const ghost = ({ lag, opacity }: (typeof GHOSTS)[number]): Variants => ({
  from: { x: "-120%", scaleX: 1.25, opacity: 0 },
  at: { x: "0%", scaleX: 1, opacity: [0, opacity, 0], transition: { x: { duration: SLIDE, delay: lag, ease: DASH }, scaleX: { duration: SLIDE, delay: lag }, opacity: { duration: SLIDE + lag + 0.1, times: [0, 0.3, 1] } } },
  to: { x: "130%", scaleX: 1.25, opacity: [0, opacity, 0], transition: { duration: 0.3, delay: lag, ease: LAUNCH } },
});

function SpeedLines() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {SPEED_LINES.map((line) => (
        <motion.span
          key={line.top}
          className={`absolute rounded-full bg-gradient-to-r from-transparent via-accent-text to-transparent ${line.thick ? "h-[3px]" : "h-px"}`}
          style={{ top: `${line.top}%`, width: `${line.length}%`, left: "100%" }}
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: "-330%", opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: 0.5, delay: line.delay, ease: "easeIn" }}
        />
      ))}
    </span>
  );
}

/** The headline's second line: each swap is a dash, like the apply buttons — the phrase shoots off to the right with a motion-blur trail and the next one slides in, brakes and knocks into place. Long phrases shrink to stay on one line. */
function RotatingLine({ phrases, className }: { phrases: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  // Explicitly requested: the headline keeps cycling even with reduced motion, like the title vibration.
  useEffect(() => {
    if (phrases.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % phrases.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [phrases.length]);
  const phrase = phrases[index];
  return (
    <span className={`relative block h-[1.25em] [container-type:inline-size] ${className ?? ""}`}>
      <span className="sr-only">{phrases[0]}</span>
      <SpeedLines key={`lines-${index}`} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          aria-hidden
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
          style={{ fontSize: `min(1em, calc(100cqw / ${(phrase.length * 0.5).toFixed(2)}))` }}
          initial="from"
          animate="at"
          exit="to"
        >
          <span className="relative inline-block">
            {GHOSTS.map((item) => <motion.span key={item.lag} className="absolute inset-0 blur-[3px]" variants={ghost(item)}>{phrase}</motion.span>)}
            <motion.span className="relative inline-block" variants={PHRASE}>{phrase}</motion.span>
          </span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero() {
  const t = useDictionary();
  const subtitle = t.landing.hero.subtitle;
  const subtitleBreak = subtitle.indexOf(". ") + 1;

  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start end", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.45], reduce ? [0, 0] : [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.45], reduce ? [1, 1] : [0.9, 1]);
  const leftY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -80]);
  const rightY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [100, -40]);

  return (
    <section className="relative overflow-hidden px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
      {/* Fond : grille + glow violet */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-[-20%] left-1/2 h-[720px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-80" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">

        <h1 className="mt-6 font-display text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
          <AnimatedWords text={t.landing.hero.titleLine1} className="block" delay={0.1} />
          <motion.span className="block" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>
            <RotatingLine phrases={t.landing.hero.titleRotations} className="font-heading text-[clamp(1.25rem,6.2vw,2.5rem)] font-extralight text-accent-text sm:text-[clamp(1rem,5.5vw,4.25rem)]" />
          </motion.span>
        </h1>

        <motion.p
          className="mt-5 max-w-2xl text-sm text-balance text-muted sm:mt-6 sm:text-base"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
        >
          {subtitleBreak > 0 ? <><span className="block sm:inline">{subtitle.slice(0, subtitleBreak)}</span>{" "}{subtitle.slice(subtitleBreak).trimStart()}</> : subtitle}
        </motion.p>

        <motion.div
          className="mt-9 flex flex-col items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
        >
          <Link href="/register" className={buttonVariants({ variant: "purple", size: "lg", className: "group h-14 gap-2.5 px-9 text-base sm:h-16 sm:px-11 sm:text-lg" })}>
            {t.landing.hero.promptCta}
            <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-[13px] text-subtle">{t.landing.hero.trust}</p>
        </motion.div>
      </div>

      {/* Scène : vidéo principale + formats flottants */}
      <div ref={stageRef} className="relative mx-auto mt-14 max-w-6xl [perspective:1400px] sm:mt-20">
        <motion.div
          style={{ rotateX, scale }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.7 }}
          className="relative origin-top rounded-[1.25rem] border border-line-strong bg-surface p-1.5 shadow-[0_40px_120px_-30px_var(--accent-glow)] sm:rounded-[1.75rem] sm:p-2"
        >
          <div className="relative overflow-hidden rounded-[1rem] sm:rounded-[1.35rem]">
            <video
              src={t.locale === "en" ? "/medias/kinetik_landscape3.mp4" : "/medias/kinetik-16x9_fr.mp4"}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={t.copy["0a30c71f4ab2"]}
              className="aspect-video w-full object-contain"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-5">
              <Badge tone="glass">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                {t.landing.hero.previewLabel}
              </Badge>
              <Badge tone="glass" className="hidden font-mono sm:inline-flex">

                {"16:9 · 1080p"}
              </Badge>
            </div>
          </div>
        </motion.div>

        <motion.div
          style={{ y: leftY }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
          className="absolute -bottom-16 -left-1 w-[22%] max-w-[220px] sm:-bottom-8 sm:w-[26%] rounded-2xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-lift)] sm:-left-10 sm:rounded-3xl sm:p-1.5 lg:-left-16"
        >
          <video
            src={t.locale === "en" ? "/medias/kinetik_vertical2.mp4" : "/medias/kinetik-9x16_fr.mp4"}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={t.copy["adec075cd35e"]}
            className="aspect-[9/16] w-full rounded-xl object-contain sm:rounded-[1.25rem]"
          />
          <span className="absolute -top-3 left-3 rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] font-medium text-bg">{"9:16"}</span>
        </motion.div>

        <motion.div
          style={{ y: rightY }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1.1 }}
          className="absolute -right-1 -bottom-20 w-[26%] max-w-[260px] sm:-bottom-12 sm:w-[30%] rounded-2xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-lift)] sm:-right-10 sm:rounded-3xl sm:p-1.5 lg:-right-16"
        >
          <video
            src={t.locale === "en" ? "/medias/kinetik_square2.mp4" : "/medias/kinetik-1x1_fr.mp4"}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={t.copy["788f01f848c0"]}
            className="aspect-square w-full rounded-xl object-contain sm:rounded-[1.25rem]"
          />
          <span className="absolute -top-3 left-3 rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] font-medium text-bg">{"1:1"}</span>
        </motion.div>
      </div>
    </section>
  );
}
