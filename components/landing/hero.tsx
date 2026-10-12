"use client";

import { ArrowRight, Pause, Volume2 } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

function AnimatedWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
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

export function Hero() {
  const router = useRouter();
  const [appName, setAppName] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: stageRef, offset: ["start end", "end start"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.45], reduce ? [0, 0] : [18, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.45], reduce ? [1, 1] : [0.9, 1]);
  const leftY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -80]);
  const rightY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [100, -40]);

  const label = appName.trim() || "Flowly";

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const name = appName.trim();
    router.push(name ? `/register?app=${encodeURIComponent(name)}` : "/register");
  }

  return (
    <section className="relative overflow-hidden px-4 pt-32 pb-16 sm:px-6 sm:pt-40 sm:pb-24">
      {/* Fond : grille + glow violet */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-grid mask-fade-b opacity-70" />
        <div className="absolute top-[-20%] left-1/2 h-[720px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-80" />
        <div className="absolute top-[10%] left-[8%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(217_70_239/0.22),transparent)]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">

        <h1 className="mt-6 font-display text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
          <AnimatedWords text={t.landing.hero.titleLine1} className="block" delay={0.1} />
          <AnimatedWords text={t.landing.hero.titleLine2} className="block whitespace-nowrap font-heading text-[clamp(1rem,5.5vw,4.25rem)] font-extralight text-accent-text" delay={0.25} />
        </h1>

        <motion.p
          className="mt-6 max-w-2xl text-base text-muted sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
        >
          {t.landing.hero.subtitle}
        </motion.p>

        <motion.form
          onSubmit={onSubmit}
          className="mt-8 w-full max-w-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
        >
          <div className="glass flex flex-col gap-2 rounded-[1.75rem] border border-line-strong p-2 shadow-[var(--shadow-lift)] transition-shadow focus-within:shadow-[var(--shadow-glow)] sm:flex-row sm:items-center sm:rounded-full">
            <label htmlFor="hero-app-name" className="sr-only">
              {t.landing.hero.promptPlaceholder}
            </label>
            <input
              id="hero-app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={t.landing.hero.promptPlaceholder}
              maxLength={40}
              autoComplete="off"
              className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-fg outline-none placeholder:text-subtle focus-visible:outline-none"
            />
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              {t.landing.hero.promptCta}
              <ArrowRight />
            </Button>
          </div>
          <p className="mt-3 text-[13px] text-subtle">{t.landing.hero.trust}</p>
        </motion.form>
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
          <VideoPlaceholder
            ratio="16:9"
            scene="blobs"
            palette={["#12062b", "#7c3aed", "#f472b6"]}
            label={label}
            className="rounded-[1rem] sm:rounded-[1.35rem]"
          >
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-5">
              <Badge tone="glass">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                {t.landing.hero.previewLabel}
              </Badge>
              <Badge tone="glass" className="hidden font-mono sm:inline-flex">
                16:9 · 1080p
              </Badge>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-3 text-white sm:p-5">
              <Pause className="size-4 shrink-0" />
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="absolute inset-y-0 left-0 w-full origin-left animate-[progress_12s_linear_infinite] rounded-full bg-white" />
              </div>
              <span className="font-mono text-[11px] text-white/80">0:30</span>
              <Volume2 className="hidden size-4 shrink-0 sm:block" />
            </div>
          </VideoPlaceholder>
        </motion.div>

        <motion.div
          style={{ y: leftY }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
          className="absolute -bottom-16 -left-1 w-[22%] max-w-[220px] sm:-bottom-8 sm:w-[26%] rounded-2xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-lift)] sm:-left-10 sm:rounded-3xl sm:p-1.5 lg:-left-16"
        >
          <VideoPlaceholder ratio="9:16" scene="type" palette={["#f5f0e6", "#111111", "#7c3aed"]} label={label} className="rounded-xl sm:rounded-[1.25rem]" />
          <span className="absolute -top-3 left-3 rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] font-medium text-bg">9:16</span>
        </motion.div>

        <motion.div
          style={{ y: rightY }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 1.1 }}
          className="absolute -right-1 -bottom-20 w-[26%] max-w-[260px] sm:-bottom-12 sm:w-[30%] rounded-2xl border border-line-strong bg-surface p-1 shadow-[var(--shadow-lift)] sm:-right-10 sm:rounded-3xl sm:p-1.5 lg:-right-16"
        >
          <VideoPlaceholder ratio="1:1" scene="rings" palette={["#0b0320", "#c026ff", "#22d3ee"]} className="rounded-xl sm:rounded-[1.25rem]" />
          <span className="absolute -top-3 left-3 rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] font-medium text-bg">1:1</span>
        </motion.div>
      </div>
    </section>
  );
}
