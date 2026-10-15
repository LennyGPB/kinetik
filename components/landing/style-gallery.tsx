"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useState } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { STYLE_CATEGORIES, VIDEO_STYLES, type StyleCategory } from "@/config/styles";

import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section-heading";

type Filter = StyleCategory | "all";
const PREVIEW_COUNT = 6;

export function StyleGallery() {
  const t = useDictionary();

  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const styles = filter === "all" ? VIDEO_STYLES : VIDEO_STYLES.filter((s) => s.category === filter);
  const visibleStyles = expanded ? styles : styles.slice(0, PREVIEW_COUNT);

  return (
    <Section id="styles">
      <SectionHeading
        className="max-w-5xl"
        title={
          <>
            <span className="block">{t.landing.gallery.titleLine1}</span>
            <span className="block whitespace-nowrap font-heading text-[clamp(1rem,4.4vw,3.5rem)] font-extralight text-accent-text">
              {t.landing.gallery.titleLine2}
            </span>
          </>
        }
        subtitle={t.landing.gallery.subtitle}
      />

      <div className="-mx-4 mt-10 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={t.landing.gallery.title} className="mx-auto flex w-max gap-2">
          {(["all", ...STYLE_CATEGORIES] as Filter[]).map((cat) => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(cat);
                  setExpanded(false);
                }}
                className={cn(
                  "relative rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active ? "border-transparent text-accent-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="gallery-filter"
                    className="absolute inset-0 rounded-full bg-accent-gradient shadow-[0_6px_20px_-6px_var(--accent-glow)]"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <span className="relative">{t.styleCategories[cat]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          id="style-gallery-grid"
          key={filter}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className={cn(
            "mx-auto mt-8 w-full columns-2 gap-3 sm:gap-4 md:columns-3",
            expanded ? "max-w-7xl lg:columns-4" : "max-w-5xl",
          )}
        >
          {visibleStyles.map((style) => (
            <motion.div
              key={style.id}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="mb-3 break-inside-avoid sm:mb-4"
            >
              <Link
                href={`/register?style=${style.id}`}
                className="group relative block overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-[0_20px_50px_-20px_var(--accent-glow)] sm:rounded-3xl"
              >
                <div className="overflow-hidden">
                  <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
                    <VideoPlaceholder ratio={style.ratio} palette={style.palette} templateId={style.id} scene={style.recipe.background} label={style.name.split(" ")[0]} src={style.previewSrc} />
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold text-white sm:text-lg">{style.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/70 max-sm:hidden">{t.styles[style.id as keyof typeof t.styles]}</p>
                    </div>
                    <span className="grid size-8 shrink-0 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <ArrowUpRight className="size-4" />
                      <span className="sr-only">{t.landing.gallery.use}</span>
                    </span>
                  </div>
                </div>
                <Badge tone="glass" className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3">
                  {t.styleCategories[style.category]}
                </Badge>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {styles.length > PREVIEW_COUNT && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="style-gallery-grid"
            onClick={() => setExpanded((value) => !value)}
            className="px-3 py-2 text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            {expanded ? t.copy["e7bd64d3ec4d"] : t.copy["be55c61d5ebf"]}
          </button>
        </div>
      )}
    </Section>
  );
}
