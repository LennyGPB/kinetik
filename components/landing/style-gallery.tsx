"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { TemplateHoverPreview } from "@/components/media/template-hover-preview";
import { PostPreview } from "@/components/posts/post-preview";
import { StorePreview } from "@/components/store/store-preview";
import { Badge } from "@/components/ui/badge";
import { STYLE_CATEGORIES, VIDEO_STYLES, type StyleCategory, type VideoStyle } from "@/config/styles";
import { getLogoMotion } from "@/config/logo-motion";
import { POST_TEMPLATES } from "@/config/post-templates";
import { STORE_TEMPLATES } from "@/config/store-templates";
import { demoPost } from "@/lib/posts/document";
import { postCopy } from "@/lib/posts/copy";
import { demoStore } from "@/lib/store/document";
import { storeCopy } from "@/lib/store/copy";

import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./section-heading";

type Kind = "all" | "motion" | "logo" | "post" | "store";
type Filter = StyleCategory | "all";
type Item =
  | { kind: "motion" | "logo"; id: string; style: VideoStyle }
  | { kind: "post"; id: string; template: (typeof POST_TEMPLATES)[number] }
  | { kind: "store"; id: string; template: (typeof STORE_TEMPLATES)[number] };

const PREVIEW_COUNT = 6;
/** Round-robin over groups: a stable, varied order that is identical on the server and the client. */
const interleave = <T,>(groups: T[][]) => Array.from({ length: Math.max(...groups.map((group) => group.length)) }, (_, index) => groups.flatMap((group) => group[index] ? [group[index]] : [])).flat();

const MOTION_STYLES = VIDEO_STYLES.filter((style) => !getLogoMotion(style.id));
const MOTION_CATEGORIES = STYLE_CATEGORIES.filter((category) => MOTION_STYLES.some((style) => style.category === category));
const MOTION_ITEMS: Item[] = interleave(MOTION_CATEGORIES.map((category) => MOTION_STYLES.filter((style) => style.category === category))).map((style) => ({ kind: "motion", id: style.id, style }));
const ITEMS: Record<Exclude<Kind, "all">, Item[]> = {
  motion: MOTION_ITEMS,
  logo: VIDEO_STYLES.filter((style) => getLogoMotion(style.id)).map((style) => ({ kind: "logo", id: style.id, style })),
  post: POST_TEMPLATES.map((template) => ({ kind: "post", id: template.id, template })),
  store: STORE_TEMPLATES.map((template) => ({ kind: "store", id: template.id, template })),
};
const ALL_ITEMS = interleave([ITEMS.motion, ITEMS.logo, ITEMS.post, ITEMS.store]);

export function StyleGallery() {
  const t = useDictionary();
  const { locale } = t;

  const [kind, setKind] = useState<Kind>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const items = kind === "all" ? ALL_ITEMS : kind === "motion" && filter !== "all" ? MOTION_ITEMS.filter((item) => item.kind === "motion" && item.style.category === filter) : ITEMS[kind];
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const kindLabels: Record<Kind, string> = { all: t.styleCategories.all, motion: postCopy(locale).motion, logo: t.styleCategories.logo, post: postCopy(locale).posts, store: storeCopy(locale).kind };
  const reset = () => { setExpanded(false); setPlayingId(null); };

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

      <FilterRow label={postCopy(locale).newContent} layoutId="gallery-kind" className="mt-10" value={kind} options={(["all", "motion", "logo", "post", "store"] as Kind[]).map((value) => ({ value, label: kindLabels[value] }))} onChange={(value) => { setKind(value); setFilter("all"); reset(); }} />
      <AnimatePresence initial={false}>
        {kind === "motion" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <FilterRow small label={t.landing.gallery.title} layoutId="gallery-filter" className="mt-3" value={filter} options={(["all", ...MOTION_CATEGORIES] as Filter[]).map((value) => ({ value, label: t.styleCategories[value] }))} onChange={(value) => { setFilter(value); reset(); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          id="style-gallery-grid"
          key={`${kind}-${filter}`}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className={cn(
            "mx-auto mt-8 w-full columns-2 gap-3 sm:gap-4 md:columns-3",
            expanded ? "max-w-7xl lg:columns-4" : "max-w-5xl",
          )}
        >
          {visibleItems.map((item) => (
            <motion.div
              key={`${item.kind}-${item.id}`}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="mb-3 break-inside-avoid sm:mb-4"
            >
              <GalleryCard item={item} playing={playingId === item.id} onPlay={setPlayingId} badge={item.kind === "motion" ? t.styleCategories[item.style.category] : kindLabels[item.kind]} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {items.length > PREVIEW_COUNT && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="style-gallery-grid"
            onClick={() => { setPlayingId(null); setExpanded((value) => !value); }}
            className="px-3 py-2 text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
          >
            {expanded ? t.copy["e7bd64d3ec4d"] : t.copy["be55c61d5ebf"]}
          </button>
        </div>
      )}
    </Section>
  );
}

function FilterRow<T extends string>({ label, layoutId, value, options, onChange, small = false, className }: { label: string; layoutId: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; small?: boolean; className?: string }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0", className)}>
      <div role="tablist" aria-label={label} className="mx-auto flex w-max gap-2 py-0.5">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative rounded-full border font-medium transition-colors",
                small ? "px-3.5 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
                active ? (small ? "border-accent/50 text-accent-text" : "border-transparent text-accent-fg") : "border-line text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className={cn("absolute inset-0 rounded-full", small ? "bg-accent-soft" : purpleButtonStyle)}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One gallery tile; every kind leads to sign-up, then straight to its own creation form. */
function GalleryCard({ item, playing, onPlay, badge }: { item: Item; playing: boolean; onPlay: (id: string | null) => void; badge: string }) {
  const t = useDictionary();
  const { locale } = t;
  const post = useMemo(() => item.kind === "post" ? demoPost(item.id, locale) : null, [item.kind, item.id, locale]);
  const store = useMemo(() => item.kind === "store" ? demoStore(item.id, locale) : null, [item.kind, item.id, locale]);
  const href = item.kind === "post" || item.kind === "store" ? `/register?kind=${item.kind}&style=${item.id}` : `/register?style=${item.id}`;
  const name = "style" in item ? item.style.name : item.template.name;
  const description = "style" in item ? t.styles[item.id as keyof typeof t.styles] : item.template.description[locale];
  let visual: ReactNode;
  if (item.kind === "post" && post) visual = <PostPreview document={post} index={playing && post.pages.length > 1 ? 1 : 0} demo />;
  else if (item.kind === "store" && store) visual = <div className="flex aspect-[4/5] items-start justify-center gap-[4%] px-[6%] pt-[8%]" style={{ background: item.template.palette[0] }}>{(playing ? [3, 4] : [1, 2]).map((page) => <StorePreview key={page} document={store} index={page} className="w-[46%] shrink-0 rounded-lg shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)]" />)}</div>;
  else if (item.kind === "motion" || item.kind === "logo") {
    const { style } = item;
    visual = <>
      <VideoPlaceholder ratio={style.ratio} palette={style.palette} templateId={style.id} scene={style.recipe.background} label={item.kind === "logo" ? undefined : style.name.split(" ")[0]} src={style.previewSrc} />
      {playing && <TemplateHoverPreview key={style.id} style={style} locale={locale} format={style.ratio === "9:16" ? "PORTRAIT" : style.ratio === "16:9" ? "LANDSCAPE" : "SQUARE"} frameRatio={Number(style.ratio.split(":")[0]) / Number(style.ratio.split(":")[1])} />}
    </>;
  }
  return (
    <Link
      href={href}
      onMouseEnter={() => onPlay(item.id)}
      onMouseLeave={() => onPlay(null)}
      onFocus={() => onPlay(item.id)}
      onBlur={() => onPlay(null)}
      className="group relative block overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-[0_20px_50px_-20px_var(--accent-glow)] sm:rounded-3xl"
    >
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">{visual}</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-white sm:text-lg">{name}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-white/70 max-sm:hidden">{description}</p>
          </div>
          <span className="grid size-8 shrink-0 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <ArrowUpRight className="size-4" />
            <span className="sr-only">{t.landing.gallery.use}</span>
          </span>
        </div>
      </div>
      <Badge tone="glass" className="absolute top-2.5 left-2.5 z-20 sm:top-3 sm:left-3">
        {badge}
      </Badge>
    </Link>
  );
}
