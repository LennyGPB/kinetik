"use client";

import { t } from "@/lib/i18n";
import { motion, useReducedMotion } from "motion/react";

const TILTS = ["-rotate-3 md:-rotate-4", "rotate-2 md:translate-y-6 md:rotate-3", "-rotate-2 md:-rotate-3"];

function StepGraphic({ index }: { index: number }) {
  if (index === 0) {
    return (
      <span aria-hidden="true" className="relative block h-14 w-20">
        <span className="absolute top-1 left-1 h-10 w-12 -rotate-12 rounded border border-fg/25 bg-surface motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:-rotate-20" />
        <span className="absolute top-2 left-3 h-10 w-12 rotate-6 rounded border border-fg/40 bg-surface motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1 motion-safe:group-hover:rotate-12" />
        <span className="absolute top-3 left-2 flex h-10 w-12 -rotate-3 flex-col gap-1 rounded border border-fg/60 bg-bg-subtle p-1.5">
          <span className="h-4 w-full rounded-sm bg-fg/10"><span className="mt-1 ml-1 block size-2 rounded-full bg-accent-text" /></span>
          <span className="h-px w-6 bg-fg/50" />
          <span className="h-px w-4 bg-fg/25" />
        </span>
      </span>
    );
  }

  if (index === 1) {
    return (
      <span aria-hidden="true" className="relative flex h-14 w-20 flex-col justify-between py-1">
        <span className="font-heading text-[28px] leading-none font-extralight tracking-tight text-fg">Aa<span className="text-accent-text">.</span></span>
        <span className="relative flex h-3 items-center gap-0.5 border-y border-fg/20 px-1">
          <span className="h-1 w-5 bg-fg/40" /><span className="h-1 w-3 bg-accent-text/60" /><span className="h-1 flex-1 bg-fg/20" />
          <span className="absolute -top-1 left-3 h-5 w-px bg-accent-text motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:translate-x-12"><span className="absolute -left-0.5 top-0 size-1.5 bg-accent-text" /></span>
        </span>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="relative flex h-14 w-20 items-center">
      <span className="relative flex h-12 w-16 -rotate-6 flex-col justify-between rounded border border-fg/50 bg-surface px-2 py-1.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-0">
        <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-accent-text" /><span className="h-px w-5 bg-fg/30" /></span>
        <span className="font-mono text-xs font-medium tracking-tight text-fg">.MP4</span>
      </span>
    </span>
  );
}

export function HowItWorks() {
  const reduceMotion = useReducedMotion();
  return (
    <section id="how" aria-labelledby="how-title" className="overflow-hidden px-7 py-10 sm:px-10 sm:py-14">
      <h2 id="how-title" className="text-center text-xs font-medium tracking-[0.18em] text-subtle uppercase">
        trois étapes
      </h2>
      <div className="relative mx-auto mt-10 max-w-6xl pb-8 md:mt-12">
        <svg aria-hidden="true" viewBox="0 0 1200 260" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full text-accent-text md:block" fill="none">
          <path d="M 250 115 C 360 -45, 420 280, 570 145 S 810 -30, 950 110" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.65" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg aria-hidden="true" viewBox="0 0 300 700" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full text-accent-text md:hidden" fill="none">
          <path d="M 150 80 C 340 180, -40 280, 150 350 S 340 530, 150 620" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.65" vectorEffect="non-scaling-stroke" />
        </svg>
        <ol className="relative grid gap-12 md:grid-cols-3 md:gap-12 lg:gap-16">
          {t.landing.how.steps.map((step, index) => {
            return (
              <motion.li
                key={step.title}
                className="relative hover:z-10"
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                >
                <div className={`group relative h-full rounded-2xl border border-line-strong bg-bg-subtle p-5 sm:p-6 ${TILTS[index]}`}>
                <div className="flex items-center justify-between">
                  <StepGraphic index={index} />
                  <span aria-hidden="true" className="font-heading text-xl font-extralight text-subtle">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>
                </motion.div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
