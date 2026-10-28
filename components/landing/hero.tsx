"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { HeroCapabilities } from "./hero-capabilities";
import { Starfield } from "./starfield";
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

export function Hero() {
  const t = useDictionary();
  const subtitle = t.landing.hero.subtitle;
  const subtitleBreak = subtitle.indexOf(". ") + 1;

  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden pt-32 sm:pt-40 lg:pt-36">
      {/* Fond : étoiles en mouvement + glow violet */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Starfield className="absolute inset-0 size-full mask-fade-b" />
        <div className="absolute top-[-20%] left-1/2 h-[720px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-glow),transparent)] opacity-80" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 sm:px-6">
        {/* Titre fixe, sous-titre et bouton */}
        <div className="flex flex-col items-center text-center">
          <h1 className="w-full font-display text-[clamp(2.6rem,9vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.045em] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            <AnimatedWords text={t.locale === "fr" ? "Crée ta vidéo de studio" : "Create studio-grade videos"} className="block" delay={0.1} />
            <motion.span className="block" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}>
              <span className="-mt-[0.36em] block pb-2 font-heading leading-[1.1] text-[clamp(1.45rem,7.2vw,2.9rem)] font-extralight text-accent-text sm:text-[clamp(1.15rem,6.3vw,4.9rem)] lg:text-[clamp(1.15rem,3.8vw,3.75rem)]">{t.locale === "fr" ? "en quelques clics." : "in a few clicks."}</span>
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
            className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
          >
            <Link href="/register" className={buttonVariants({ variant: "purple", size: "lg", className: "group h-14 w-full max-w-sm gap-2.5 px-5 text-base sm:h-16 sm:w-auto sm:max-w-none sm:px-11 sm:text-lg" })}>
              {t.landing.hero.promptCta}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a href="#styles" className={buttonVariants({ variant: "outline", size: "lg", className: "h-14 w-full max-w-sm px-5 text-base sm:h-16 sm:w-auto sm:max-w-none sm:px-8 sm:text-lg" })}>
              {t.landing.hero.secondaryCta}
            </a>
          </motion.div>
        </div>

      </div>
      <HeroCapabilities />
      <div className="mt-8 w-full shrink-0 lg:mt-4">
        <PlatformMarquee />
      </div>
    </section>
  );
}
