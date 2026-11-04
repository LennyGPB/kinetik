"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, Bell, CalendarDays, Camera, Coffee, Check, Clock, PartyPopper, Plus, Soup, Sparkles, Star, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import Link from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Starfield } from "@/components/landing/starfield";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Reveal } from "@/components/motion/reveal";
import { formatPrice } from "@/config/pricing";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { landingCopy } from "@/lib/resto/landing-copy";
import { cn } from "@/lib/utils";
import { LandingDemo } from "./landing-demo";
import { restoExample as example, restoExamplePhotos } from "./resto-examples";
import { restoVideoProps } from "./resto-form";
import { Player } from "@remotion/player";
import type { RestoContent } from "@/lib/resto/content";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { durationInFrames, FPS, videoDimensions } from "@/remotion/props";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Glissement doux de la surbrillance d'un élément à l'autre */
const SLIDE = { type: "spring", stiffness: 170, damping: 26, mass: 0.9 } as const;
/** Après l'inscription, direction l'offre Resto */
const START = "/register?redirectTo=%2Fresto%2Foffre";
/** Carte violette mise en avant : même rendu que l'offre Pro de la home */
const VIOLET = "isolate bg-[linear-gradient(155deg,#9061f9_0%,#7c3aed_40%,#4c1d95_100%)] text-white shadow-[0_0_0_1px_rgb(196_181_253/0.6),0_30px_90px_-20px_rgb(139_92_246/0.8),0_0_70px_-10px_rgb(168_85_247/0.55)]";

function Shine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden ring-1 ring-white/25 ring-inset", className)}>
      <span className="absolute -top-28 left-1/2 h-60 w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
      <span className="absolute inset-0 animate-sweep bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.2)_50%,transparent_65%)] [animation-duration:4.5s] motion-reduce:hidden" />
    </span>
  );
}

/** Titre de section façon home : ligne grasse + ligne fine violette. */
function Heading({ title, accent, className }: { title: string; accent?: string; className?: string }) {
  return (
    <Reveal className={cn("mx-auto flex max-w-3xl flex-col items-center gap-4 text-center", className)}>
      <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1] font-extrabold tracking-[-0.04em]">
        {title}
        {accent && <span className="block font-heading text-[clamp(1.4rem,3.6vw,2.6rem)] leading-[1.2] font-extralight tracking-normal text-accent-text">{accent}</span>}
      </h2>
    </Reveal>
  );
}

function Cta({ children, light = false, className }: { children: ReactNode; light?: boolean; className?: string }) {
  return (
    <Link href={START} className={buttonVariants({ variant: light ? "secondary" : "purple", size: "lg", className: cn("group h-14 gap-2.5 px-8 text-base sm:h-16 sm:px-11 sm:text-lg", light && "bg-white text-black shadow-[0_20px_50px_-12px_rgb(0_0_0/0.5)]", className) })}>
      {children}<ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

/* ───────────────────────── Accroche ───────────────────────── */

function Hero() {
  const t = useDictionary();
  const l = landingCopy(t.locale).hero;
  const reduce = useReducedMotion();
  const words = l.title.split(" ");
  const chipPos = ["top-[10%] left-0 sm:-left-6", "top-[42%] right-0 sm:-right-4", "bottom-[8%] left-2 sm:left-0"];
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 lg:pb-24">
      {/* Fond sans bord : il déborde sous la section suivante et s'y fond (pas de coupure nette) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -bottom-48 -z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" aria-hidden>
        <Starfield className="absolute inset-0 size-full" />
        <div className="absolute top-[-15%] left-1/2 h-[720px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-80" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="font-display text-[clamp(2.4rem,6.4vw,4.6rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
            <span className="block">
              {words.map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.22em] align-bottom">
                    <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.07 }}>{word}</motion.span>
                  </span>
                </Fragment>
              ))}
            </span>
            <motion.span className="block font-heading text-[clamp(1.6rem,4.4vw,3.3rem)] leading-[1.15] font-extralight tracking-normal text-accent-text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}>{l.accent}</motion.span>
          </h1>
          <motion.p className="mt-5 max-w-md text-base text-balance text-muted sm:text-lg" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}>{l.subtitle}</motion.p>
          <motion.div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}>
            <Cta className="w-full max-w-sm sm:w-auto">{l.cta}</Cta>
            <a href="#prix" className={buttonVariants({ variant: "outline", size: "lg", className: "h-14 w-full max-w-sm px-8 text-base sm:h-16 sm:w-auto sm:text-lg" })}>{l.secondary}</a>
          </motion.div>
        </div>

        {/* Téléphones qui jouent des contenus, et étiquettes qui flottent autour */}
        <motion.div className="relative mx-auto w-full max-w-xl" initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}>
          <LandingDemo />
          {l.chips.map((chip, i) => (
            <motion.span key={chip} className={cn("absolute z-20 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-bg/85 px-3.5 py-2 text-xs font-semibold whitespace-nowrap shadow-xl backdrop-blur sm:text-sm", chipPos[i])}
              initial={{ opacity: 0, scale: 0.8 }} animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.9 + i * 0.2 }, scale: { delay: 0.9 + i * 0.2, ease: EASE }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 } }}>
              {i === 2 ? <BadgeCheck className="size-4 text-emerald-500" /> : <span className="size-2 rounded-full bg-violet-500" />}{chip}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/** Bande qui défile : tout ce qu'un resto poste. */
function Marquee() {
  const t = useDictionary();
  const items = landingCopy(t.locale).marquee;
  // Même défilement CSS que la bande de la home : il continue même en « mouvement réduit » (activé d'office sous Windows)
  return (
    <div className="mask-fade-x relative flex overflow-hidden py-5" aria-hidden>
      <div className="platform-marquee-track flex w-max shrink-0">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10 pr-10">
            {items.map((item) => (
              <span key={item} className="flex items-center gap-10 font-heading text-lg font-extralight whitespace-nowrap text-muted sm:text-2xl">{item}<span className="size-1.5 rounded-full bg-accent-text" /></span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── La semaine ───────────────────────── */

const WEEK_ICONS: LucideIcon[] = [Bell, BadgeCheck, Camera, Wine, Coffee];

/**
 * La semaine d'un resto avec Kinetik : une frise dont le trait se remplit, un point lumineux qui la parcourt,
 * et un moment mis en avant tour à tour (comme une notification qui arrive).
 */
function Week() {
  const t = useDictionary();
  const w = landingCopy(t.locale).week;
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(false);
  const steps = w.days.length - 1;
  // Avancement du point sur la frise (0 = premier jour, 1 = dernier), en boucle une fois la section visible
  const progress = useMotionValue(0);
  const left = useTransform(progress, (v) => `${v * 100}%`);
  useMotionValueEvent(progress, "change", (v) => setActive(Math.min(steps, Math.floor(v * steps + 0.03))));
  useEffect(() => {
    if (!seen) return;
    const run = animate(progress, [0, 1], { duration: 1.9 * steps, ease: "linear", repeat: Infinity, repeatDelay: 1.2 });
    return () => run.stop();
  }, [seen, progress, steps]);

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <Heading title={w.title} accent={w.accent} />
      <motion.div className="relative mx-auto mt-16 max-w-6xl" onViewportEnter={() => setSeen(true)} viewport={{ once: true, amount: 0.4 }}>
        {/* Frise : trait de fond, trait violet qui se remplit, point qui la parcourt */}
        <div aria-hidden className="absolute top-[22px] right-[10%] left-[10%] hidden h-[2px] md:block">
          <motion.div className="absolute inset-0 origin-left rounded-full bg-white/70" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          {/* Traînée violette derrière le point */}
          <motion.div className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-violet-500/60 to-violet-400" style={{ width: "18%", left, x: "-100%" }} />
          <motion.span className="absolute top-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgb(139_92_246/0.25),0_0_18px_4px_rgb(139_92_246/0.9)]" style={{ left }} />
        </div>
        <ol className="grid gap-4 md:grid-cols-5">
          {w.days.map(([day, time, title, text], i) => {
            const Icon = WEEK_ICONS[i];
            const on = active === i;
            return (
              <motion.li key={`${day}-${time}`} className="flex flex-col items-stretch gap-4 md:items-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.12 }}>
                {/* Point de la frise : l'anneau violet glisse d'un jour à l'autre */}
                <span className={cn("relative z-20 hidden size-11 place-items-center rounded-full border-2 border-line-strong bg-bg font-display text-xs font-bold transition-colors duration-500 md:grid", on ? "text-white" : "text-muted")}>
                  {on && <motion.span layoutId="week-node" className="absolute -inset-[3px] rounded-full border-2 border-violet-500 bg-violet-600/25 shadow-[0_0_0_6px_rgb(139_92_246/0.15),0_0_30px_rgb(139_92_246/0.6)]" transition={SLIDE} />}
                  <span className="relative">{day}</span>
                </span>
                {/* Le moment, façon notification */}
                <motion.div className="relative h-full w-full" animate={{ y: on ? -8 : 0 }} transition={SLIDE}>
                  {/* Lueur qui glisse d'une carte à la suivante */}
                  {on && <motion.div layoutId="week-card" className="absolute -inset-px rounded-[1.6rem] bg-[linear-gradient(160deg,rgb(167_139_250/0.9),rgb(124_58_237/0.35)_45%,rgb(217_70_239/0.6))] shadow-[0_30px_60px_-30px_rgb(139_92_246),0_0_40px_-12px_rgb(168_85_247/0.7)]" transition={SLIDE} />}
                  <div className="relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border border-white/[0.07] bg-[linear-gradient(180deg,rgb(255_255_255/0.05),rgb(255_255_255/0.01))] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] [background-color:var(--bg-subtle)]">
                    {/* Grand jour en filigrane */}
                    <span aria-hidden className={cn("pointer-events-none absolute -right-2 -bottom-5 font-heading text-7xl leading-none font-extralight transition-colors duration-700", on ? "text-violet-400/20" : "text-white/[0.04]")}>{day}</span>
                    <div className="relative flex items-center justify-between gap-2">
                      <span className={cn("grid size-11 place-items-center rounded-2xl transition-[background-color,color,box-shadow] duration-500", on ? "bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] text-white shadow-[0_8px_24px_-6px_rgb(139_92_246/0.9)]" : "bg-white/[0.05] text-accent-text")}><Icon className="size-5" /></span>
                      <span className={cn("rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors duration-500", on ? "border-violet-500/50 text-violet-200" : "border-line text-muted")}><span className="md:hidden">{day} · </span>{time}</span>
                    </div>
                    <p className="relative text-lg leading-tight font-semibold">{title}</p>
                    <p className={cn("relative text-[15px] leading-snug transition-colors duration-500", on ? "text-fg/80" : "text-muted")}>{text}</p>
                  </div>
                </motion.div>
              </motion.li>
            );
          })}
        </ol>
      </motion.div>
    </section>
  );
}

/* ───────────────────────── Les 3 étapes ───────────────────────── */

function StepGraphic({ index }: { index: number }) {
  if (index === 0) {
    // Une carte de restaurant, recopiée ligne à ligne
    return (
      <span aria-hidden className="relative flex h-14 w-20 -rotate-6 flex-col gap-1.5 rounded border border-fg/50 bg-surface p-2 transition-transform duration-300 group-hover:rotate-0">
        {[["w-8", "w-3"], ["w-10", "w-3"], ["w-7", "w-3"]].map(([a, b], i) => (
          <span key={i} className="flex items-center justify-between gap-1"><span className={cn("h-px bg-fg/50", a)} /><span className={cn("h-1 rounded-sm bg-accent-text/70", b)} /></span>
        ))}
      </span>
    );
  }
  if (index === 1) {
    // Le pack : une pile de contenus qui s'étale
    return (
      <span aria-hidden className="relative block h-14 w-20">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute top-1 h-12 w-8 rounded border border-fg/40 bg-surface transition-transform duration-300" style={{ left: 8 + i * 14, transform: `rotate(${(i - 1) * 10}deg)`, zIndex: i }}>
            <span className="mx-auto mt-1.5 block h-4 w-5 rounded-sm bg-fg/10" />{i === 2 && <span className="mx-auto mt-1 block size-1.5 rounded-full bg-accent-text" />}
          </span>
        ))}
      </span>
    );
  }
  // Le téléphone validé
  return (
    <span aria-hidden className="relative flex h-14 w-20 items-center">
      <span className="relative flex h-14 w-8 flex-col items-center justify-center rounded-lg border border-fg/50 bg-surface transition-transform duration-300 group-hover:-translate-y-1">
        <span className="grid size-5 place-items-center rounded-full bg-accent-text text-white"><Check className="size-3" /></span>
      </span>
      <span className="ml-2 font-mono text-[11px] font-medium text-fg">30 s</span>
    </span>
  );
}

function Steps() {
  const t = useDictionary();
  const h = landingCopy(t.locale).how;
  const reduce = useReducedMotion();
  const TILTS = ["-rotate-3 md:-rotate-4", "rotate-2 md:translate-y-6 md:rotate-3", "-rotate-2 md:-rotate-3"];
  const draw = (hidden: string) => ({ variants: { hidden: { clipPath: hidden }, shown: { clipPath: "inset(0% 0% 0% 0%)" } }, transition: reduce ? { duration: 0 } : { duration: 1.4, delay: 0.2, ease: EASE } });
  return (
    <section className="overflow-hidden px-7 py-16 sm:px-10 sm:py-20">
      <h2 className="sr-only">{h.eyebrow}</h2>
      <motion.div className="relative mx-auto max-w-6xl pb-8" initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.3 }}>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" {...draw("inset(0% 100% 0% 0%)")}>
          <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-accent-text" fill="none">
            <path d="M 250 115 C 360 -45, 420 280, 570 145 S 810 -30, 950 110" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.65" vectorEffect="non-scaling-stroke" />
          </svg>
        </motion.div>
        <ol className="relative grid gap-12 md:grid-cols-3 lg:gap-16">
          {h.steps.map(([title, text], index) => (
            <motion.li key={title} className="relative hover:z-10" initial={{ opacity: 0, y: 70, scale: 0.9, rotate: index % 2 ? 8 : -8, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }} viewport={{ once: true, amount: 0.3 }} transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.25 + index * 0.28, ease: EASE }}>
              <motion.div whileHover={reduce ? undefined : { scale: 1.04 }} transition={{ duration: 0.25, ease: EASE }} className="h-full">
                <div className={cn("group relative h-full rounded-2xl border border-line-strong bg-bg-subtle p-6", TILTS[index])}>
                  <div className="flex items-center justify-between"><StepGraphic index={index} /><span aria-hidden className="font-heading text-xl font-extralight text-subtle">0{index + 1}</span></div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </motion.div>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </section>
  );
}

/* ───────────────────────── Le pack (bento) ───────────────────────── */

/** Contenus du pack montrés dans la vitrine, dans l'ordre de pack.items (le menu en premier) */
const SHOWCASE: { template: RestoContent["template"] | null; icon: LucideIcon }[] = [
  { template: "menu-semaine", icon: CalendarDays },
  { template: "formule-midi", icon: UtensilsCrossed },
  { template: "plat-du-jour", icon: Soup },
  { template: "happy-hour", icon: Wine },
  { template: "evenement", icon: PartyPopper },
  { template: "avis", icon: Star },
  { template: "horaires", icon: Clock },
];
const SHOWCASE_MS = 5000;

/** La vidéo d'un exemple, jouée en boucle dans le téléphone de la vitrine. */
function ShowcaseVideo({ template }: { template: RestoContent["template"] }) {
  const t = useDictionary();
  const locale = t.locale === "en" ? "en" : "fr";
  const props = useMemo(() => restoVideoProps({ ...example(template, locale), language: locale }, restoExamplePhotos(template), null), [template, locale]);
  const { width, height } = videoDimensions(props);
  return <Player component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(props.graph)} fps={FPS} compositionWidth={width} compositionHeight={height} autoPlay loop initiallyMuted acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} />;
}

/** Plat du jour : la photo du plat devient une vidéo (la vraie demande la photo du restaurateur). */
function DishVisual({ label }: { label: string }) {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_30%_20%,rgb(251_191_36/0.4),transparent_55%),radial-gradient(circle_at_80%_90%,rgb(139_92_246/0.5),transparent_60%),#120a1f] p-6 text-center text-white">
      <span className="grid size-20 place-items-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur"><Camera className="size-9" /></span>
      <ArrowRight className="size-6 rotate-90 text-white/70" />
      <span className="grid size-20 place-items-center rounded-3xl bg-white text-violet-700"><span className="ml-1 size-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-current" /></span>
      <span className="font-heading text-lg font-extralight">{label}</span>
    </div>
  );
}

/**
 * Le pack en vitrine : à gauche la liste des contenus, à droite un grand téléphone qui joue celui qui est choisi.
 * La sélection avance toute seule (barre de progression) ; un clic la fixe sur un contenu.
 */
function Pack() {
  const t = useDictionary();
  const p = landingCopy(t.locale).pack;
  const items = [[p.menu.title, p.menu.text], ...p.items] as [string, string][];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % items.length), SHOWCASE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, items.length]);
  const current = SHOWCASE[active];

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <Heading title={p.title} accent={p.accent} />
      <div className="mx-auto mt-14 grid max-w-5xl items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-14">
        <ul className="flex flex-col gap-1.5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {items.map(([title, text], i) => {
            const Icon = SHOWCASE[i].icon;
            const on = active === i;
            return (
              <li key={title}>
                <button type="button" aria-pressed={on} onClick={() => setActive(i)} className="relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 text-left">
                  {on && (
                    <motion.span layoutId="pack-active" className="absolute inset-0 rounded-2xl border border-violet-500/50 bg-[linear-gradient(100deg,rgb(139_92_246/0.22),rgb(139_92_246/0.05))] shadow-[0_18px_40px_-24px_rgb(139_92_246/0.9)]" transition={SLIDE}>
                      {/* Temps restant avant le contenu suivant */}
                      {!paused && <motion.span key={active} className="absolute bottom-0 left-0 h-[2px] bg-violet-400" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: SHOWCASE_MS / 1000, ease: "linear" }} />}
                    </motion.span>
                  )}
                  <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl transition-[background-color,color] duration-500", on ? "bg-[linear-gradient(145deg,#a78bfa,#7c3aed)] text-white" : "bg-white/[0.05] text-accent-text")}><Icon className="size-5" /></span>
                  <span className="relative flex min-w-0 flex-col">
                    <span className={cn("font-semibold transition-colors duration-500", on ? "text-fg" : "text-fg/70")}>{title}</span>
                    <span className="truncate text-sm text-muted">{text}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Le téléphone, incliné, qui joue le contenu choisi */}
        <div className="mx-auto w-full max-w-[300px] [perspective:1400px]">
          <motion.div className="relative aspect-[9/16] overflow-hidden rounded-[2.2rem] border-[7px] border-neutral-900 bg-black shadow-[0_50px_100px_-30px_rgb(124_58_237/0.75),0_30px_60px_-30px_rgb(0_0_0/0.8)] dark:border-neutral-800"
            initial={{ rotateY: -14, rotateX: 6 }} whileHover={{ rotateY: 0, rotateX: 0, scale: 1.02 }} transition={{ duration: 0.6, ease: EASE }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0, scale: 1.06, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }} transition={{ duration: 0.5, ease: EASE }}>
                {current.template ? <ShowcaseVideo template={current.template} /> : <DishVisual label={items[active][1]} />}
              </motion.div>
            </AnimatePresence>
            <span aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(120deg,rgb(255_255_255/0.14)_0%,transparent_30%,transparent_72%,rgb(255_255_255/0.05)_100%)]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Prix ───────────────────────── */

function Pricing({ monthly, yearly }: { monthly: number; yearly: number }) {
  const t = useDictionary();
  const p = landingCopy(t.locale).pricing;
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const price = billing === "monthly" ? monthly : yearly;
  return (
    <section id="prix" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <Heading title={p.title} accent={p.accent} />
      <div className="mt-10 flex justify-center">
        <Segmented label={p.eyebrow} value={billing} onChange={setBilling} options={[
          { value: "yearly", label: <span className="inline-flex items-center gap-1.5">{p.yearly}<span className="rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent-text">{p.save}</span></span> },
          { value: "monthly", label: p.monthly },
        ]} />
      </div>
      <Reveal className={cn("relative mx-auto mt-10 grid max-w-4xl gap-8 rounded-[2rem] p-7 sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12", VIOLET)}>
        <Shine className="rounded-[2rem]" />
        {billing === "yearly" && <span className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-[0_6px_24px_-4px_rgb(167_139_250/0.9)]"><Sparkles className="size-3" />{p.popular}</span>}
        <div className="flex flex-col">
          <p className="font-semibold text-white/80">Kinetik Resto</p>
          <div className="mt-4 flex items-baseline gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={price} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="font-display text-7xl font-bold tracking-tight">{formatPrice(price, t.locale)}</motion.span>
            </AnimatePresence>
            <span className="text-sm text-white/75">{p.perMonth}</span>
          </div>
          <p className="mt-2 text-sm text-white/75">{billing === "yearly" ? p.billedYearly.replace("{total}", formatPrice(yearly * 12, t.locale)) : p.billedMonthly}</p>
          <div className="mt-auto pt-8">
            <Cta light className="w-full">{p.cta}</Cta>
            <p className="mt-3 text-center text-xs text-white/70">{p.note}</p>
          </div>
        </div>
        <ul className="flex flex-col justify-center gap-3.5 border-t border-white/20 pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-12">
          {p.includes.map((line) => <li key={line} className="flex items-start gap-3 text-[15px] text-white/90"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20"><Check className="size-3.5" /></span>{line}</li>)}
        </ul>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Questions ───────────────────────── */

function Faq() {
  const t = useDictionary();
  const f = landingCopy(t.locale).faq;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <Heading title={f.title} accent={f.accent} />
      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-3">
        {f.items.map(([q, a], i) => {
          const on = open === i;
          return (
            <Reveal key={q} delay={i * 0.04} className={cn("rounded-2xl border bg-bg-subtle transition-colors", on ? "border-violet-500/50" : "border-line")}>
              <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : i)} className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-semibold">
                {q}
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color] duration-300", on ? "rotate-45 border-violet-500 bg-violet-600 text-white" : "border-line-strong")}><Plus className="size-4" /></span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                    <p className="px-5 pb-5 text-muted">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── Dernier appel ───────────────────────── */

function FinalCta() {
  const t = useDictionary();
  const f = landingCopy(t.locale).final;
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 sm:rounded-[2.5rem]">
        <VideoPlaceholder ratio="fill" scene="blobs" palette={["#12062b", "#7c3aed", "#d946ef"]} label="" className="absolute inset-0" />
        <div className="relative flex flex-col items-center px-6 py-20 text-center text-white sm:py-28">
          <h2 className="max-w-3xl font-display text-[clamp(2rem,6vw,4.25rem)] leading-[1] font-extrabold tracking-[-0.04em]">
            {f.title}<span className="block font-heading font-extralight tracking-normal">{f.accent}</span>
          </h2>
          <p className="mt-5 max-w-xl text-white/75 sm:text-lg">{f.subtitle}</p>
          <Cta light className="mt-9">{f.cta}</Cta>
        </div>
      </Reveal>
    </section>
  );
}

/** Page publique Kinetik Resto, dans la direction artistique de la home. */
export function RestaurantsLanding({ monthly, yearly }: { monthly: number; yearly: number }) {
  return (
    <>
      <Hero />
      <Marquee />
      <Week />
      <Steps />
      <Pack />
      <Pricing monthly={monthly} yearly={yearly} />
      <Faq />
      <FinalCta />
    </>
  );
}
