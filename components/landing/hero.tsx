"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight, Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, type Variants } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PlatformMarquee } from "@/components/landing/platform-marquee";


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
    <span className={`relative block h-[1.25em] [container-type:inline-size] lg:[clip-path:inset(-0.6em_0_-0.6em_-100vw)] ${className ?? ""}`}>
      <span className="sr-only">{phrases[0]}</span>
      <SpeedLines key={`lines-${index}`} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          aria-hidden
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap lg:justify-start"
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

/** Formats shown in turn by the mockup on the right of the hero. */
const FORMATS = ["desktop", "phone", "square"] as const;
type HeroFormat = (typeof FORMATS)[number];
/** Time each format stays on screen (the progress bar of its pill fills over this duration). */
const FORMAT_MS = 4200;
const FORMAT_RATIO: Record<HeroFormat, string> = { desktop: "16:9", phone: "9:16", square: "1:1" };

/** Stable 3D poses with a quiet fade between formats; scalar targets allow interruption. */
const DEVICE: Variants = {
  at: (format: HeroFormat) => ({
    opacity: 1,
    y: 0,
    scale: 0.94,
    rotateX: 6,
    rotateY: format === "phone" ? 18 : -15,
    rotateZ: format === "phone" ? 5 : -3,
    transition: {
      duration: 0.38, delay: 0.18, ease: EASE,
      opacity: { duration: 0.24, delay: 0.18, ease: "easeOut" },
    },
  }),
  to: (format: HeroFormat) => ({
    opacity: 0, y: 10, scale: 0.94,
    rotateX: 6,
    rotateY: format === "phone" ? 18 : -15,
    rotateZ: format === "phone" ? 5 : -3,
    transition: { duration: 0.16, ease: "easeIn" },
  }),
};

function DemoVideo({ src, label, className }: { src: string; label: string; className?: string }) {
  return <video src={src} autoPlay muted loop playsInline preload="metadata" aria-label={label} className={className} />;
}

function DesktopMockup({ src, label, badge }: { src: string; label: string; badge: string }) {
  return (
    <div className="w-full">
      <div className="rounded-[14px] border border-line-strong bg-[#0c0c11] p-[1.4%] shadow-[0_40px_100px_-30px_var(--accent-glow)] sm:rounded-[18px]">
        <div className="relative overflow-hidden rounded-[8px] bg-black sm:rounded-[10px]">
          <DemoVideo src={src} label={label} className="aspect-video w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-2.5 sm:p-4">
            <Badge tone="glass">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              {badge}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mx-auto h-6 w-[13%] bg-gradient-to-b from-[#2a2a33] to-[#16161c] sm:h-9" />
      <div className="mx-auto h-2 w-[34%] rounded-full bg-[#1d1d24] shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)]" />
    </div>
  );
}

function PhoneMockup({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative h-full aspect-[9/16.6] rounded-[2.6rem] border border-line-strong bg-[#0c0c11] p-[3%] shadow-[0_40px_100px_-30px_var(--accent-glow)]">
      <div className="relative h-full overflow-hidden rounded-[2.1rem] bg-black">
        <DemoVideo src={src} label={label} className="h-full w-full object-cover" />
        <span className="absolute top-[1.6%] left-1/2 h-[3%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
      </div>
      <span className="absolute top-[18%] -right-[3px] h-[9%] w-[3px] rounded-r bg-[#26262e]" />
      <span className="absolute top-[14%] -left-[3px] h-[6%] w-[3px] rounded-l bg-[#26262e]" />
    </div>
  );
}

function SquareMockup({ src, label }: { src: string; label: string }) {
  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-line-strong bg-surface p-2 shadow-[0_40px_100px_-30px_var(--accent-glow)] sm:p-2.5">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="size-7 rounded-full bg-[conic-gradient(from_200deg,#ff5f6d,#ffc371,#7c5cff,#ff5f6d)] p-[2px]"><span className="block size-full rounded-full border-2 border-surface bg-fg" /></span>
        <span className="text-[13px] font-semibold">kinetik</span>
        <span className="ml-auto text-subtle">···</span>
      </div>
      <div className="overflow-hidden rounded-xl bg-black">
        <DemoVideo src={src} label={label} className="aspect-square w-full object-cover" />
      </div>
      <div className="flex items-center gap-3.5 px-1 pt-2.5 text-fg">
        <Heart className="size-5 fill-red-500 text-red-500" /><MessageCircle className="size-5" /><Send className="size-5" />
        <Bookmark className="ml-auto size-5" />
      </div>
    </div>
  );
}

/** Right side of the hero: one device that changes format in turn (desktop → phone → square), with clickable format pills. */
function FormatShowcase() {
  const t = useDictionary();
  const [index, setIndex] = useState(0);
  // Changing format by hand restarts the timer (the effect depends on index).
  useEffect(() => {
    const timer = setTimeout(() => setIndex((value) => (value + 1) % FORMATS.length), FORMAT_MS);
    return () => clearTimeout(timer);
  }, [index]);
  const format = FORMATS[index];
  const en = t.locale === "en";
  const videos: Record<HeroFormat, { src: string; label: string }> = {
    desktop: { src: en ? "/medias/kinetik_landscape3.mp4" : "/medias/kinetik-16x9_fr.mp4", label: t.copy["0a30c71f4ab2"] },
    phone: { src: en ? "/medias/kinetik_vertical2.mp4" : "/medias/kinetik-9x16_fr.mp4", label: t.copy["adec075cd35e"] },
    square: { src: en ? "/medias/kinetik_square2.mp4" : "/medias/kinetik-1x1_fr.mp4", label: t.copy["788f01f848c0"] },
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto flex h-[340px] w-full max-w-[560px] items-center justify-center [perspective:1400px] sm:h-[500px] lg:h-[540px]">
        {/* Halo de couleur qui épouse la forme de l'appareil */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)]"
          animate={{ width: format === "desktop" ? "110%" : format === "phone" ? "70%" : "90%", height: format === "phone" ? "100%" : "80%" }}
          transition={{ duration: 0.8, ease: EASE }}
        />
        {/* Mouvement réduit : MotionConfig ne garde que les fondus (même rendu serveur et client, sans lire la préférence au rendu) */}
        <MotionConfig reducedMotion="user">
        {/* Persistent players preserve playback across automatic and manual switches. */}
        {FORMATS.map((item) => (
          <motion.div
            key={item}
            custom={item}
            variants={DEVICE}
            initial={false}
            animate={item === format ? "at" : "to"}
            aria-hidden={item !== format}
            style={{ pointerEvents: item === format ? "auto" : "none", zIndex: item === format ? 1 : 0 }}
            className={`absolute inset-0 flex items-center justify-center ${item === "phone" ? "py-1" : "px-1"}`}
          >
            {item === "desktop" && <DesktopMockup src={videos[item].src} label={videos[item].label} badge={t.landing.hero.previewLabel} />}
            {item === "phone" && <PhoneMockup src={videos[item].src} label={videos[item].label} />}
            {item === "square" && <SquareMockup src={videos[item].src} label={videos[item].label} />}
          </motion.div>
        ))}
        </MotionConfig>
      </div>

      <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label={t.landing.hero.previewLabel}>
        {FORMATS.map((item, i) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={`relative overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${i === index ? "border-line-strong bg-surface text-fg" : "border-line text-subtle hover:text-fg"}`}
          >
            {i === index && (
              <motion.span
                key={`progress-${index}`}
                aria-hidden
                className="absolute inset-y-0 left-0 bg-accent-text/15"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: FORMAT_MS / 1000, ease: "linear" }}
              />
            )}
            <span className="relative">{t.landing.hero.formats[item]} <span className="font-mono text-[10px] opacity-60">{FORMAT_RATIO[item]}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const t = useDictionary();
  const subtitle = t.landing.hero.subtitle;
  const subtitleBreak = subtitle.indexOf(". ") + 1;

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden pt-28 sm:pt-32 lg:pt-24">
      {/* Fond : grille + glow violet */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-[-20%] left-1/2 h-[720px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-80" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* Gauche : titre, ligne qui change, sous-titre et bouton */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="w-full font-display text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            <AnimatedWords text={t.landing.hero.titleLine1} className="block" delay={0.1} />
            <motion.span className="block" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>
              <RotatingLine phrases={t.landing.hero.titleRotations} className="font-heading text-[clamp(1.25rem,6.2vw,2.5rem)] font-extralight text-accent-text sm:text-[clamp(1rem,5.5vw,4.25rem)] lg:text-[clamp(1rem,3.3vw,3.25rem)]" />
            </motion.span>
          </h1>

          <motion.p
            className="mt-5 max-w-2xl text-sm text-balance text-muted sm:mt-6 sm:text-base lg:max-w-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          >
            {subtitleBreak > 0 ? <><span className="block sm:inline">{subtitle.slice(0, subtitleBreak)}</span>{" "}{subtitle.slice(subtitleBreak).trimStart()}</> : subtitle}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col items-center lg:items-start"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
          >
            <Link href="/register" className={buttonVariants({ variant: "purple", size: "lg", className: "group h-14 gap-2.5 px-9 text-base sm:h-16 sm:px-11 sm:text-lg" })}>
              {t.landing.hero.promptCta}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Droite : un appareil qui change de format */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.7 }}>
          <FormatShowcase />
        </motion.div>
      </div>
      <div className="mt-8 w-full shrink-0 lg:mt-4">
        <PlatformMarquee />
      </div>
    </section>
  );
}
