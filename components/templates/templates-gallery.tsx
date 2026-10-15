"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight, Check, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { useCallback, useState } from "react";
import { Player } from "@/components/editor/player";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { STYLE_CATEGORIES, VIDEO_STYLES, type StyleCategory, type VideoStyle } from "@/config/styles";
import { format } from "@/lib/i18n";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { cn } from "@/lib/utils";

type Filter = StyleCategory | "all";

export function TemplatesGallery({ selectedId, onSelect, compact = false }: {
  selectedId?: string | null;
  onSelect?: (styleId: string) => void;
  compact?: boolean;
}) {
  const t = useDictionary();

  const tt = t.app.templates;

  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<VideoStyle | null>(null);
  const [videoFormat, setVideoFormat] = useState<VideoFormatId>("LANDSCAPE");
  const closePreview = useCallback(() => setOpen(null), []);
  const styles = filter === "all" ? VIDEO_STYLES : VIDEO_STYLES.filter((s) => s.category === filter);

  return (
    <div>
      <div className={cn("flex flex-col gap-4", !compact && "sm:flex-row sm:items-center sm:justify-between")}>
        <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          <Segmented
            label={tt.title}
            size="sm"
            value={filter}
            onChange={setFilter}
            options={(["all", ...STYLE_CATEGORIES] as Filter[]).map((value) => ({ value, label: t.styleCategories[value] }))}
          />
        </div>
        <p className="text-sm text-subtle">{format(tt.count, { count: styles.length })}</p>
      </div>

      <motion.ul layout className={cn("mt-6 grid grid-cols-2 gap-3 sm:gap-4", compact ? "sm:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-4")}>
        <AnimatePresence mode="popLayout">
          {styles.map((style) => (
            <motion.li
              key={style.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            >
              <button
                type="button"
                onClick={() => setOpen(style)}
                aria-label={format(t.copy["e0e8865ec0d0"], { p0: style.name, p1: selectedId === style.id ? t.copy["5bc7b547e31e"] : "" })}
                className={cn("group block w-full cursor-pointer overflow-hidden rounded-3xl border bg-surface text-left transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]", selectedId === style.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-strong")}
              >
                <div className="relative overflow-hidden">
                  <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105">
                    <VideoPlaceholder ratio="4:5" palette={style.palette} templateId={style.id} scene={style.recipe.background} label={style.name.split(" ")[0]} />
                  </div>
                  <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/25">
                    <span className="grid size-12 scale-75 place-items-center rounded-full bg-white text-black opacity-0 shadow-xl transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                      <Play className="size-5 translate-x-px" />
                    </span>
                  </span>
                  <Badge tone="glass" className="absolute top-3 left-3">
                    {t.styleCategories[style.category]}
                  </Badge>
                  {selectedId === style.id && <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-4" aria-hidden /></span>}
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-semibold">{style.name}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{t.styles[style.id as keyof typeof t.styles]}</p>
                </div>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <Dialog
        open={Boolean(open)}
        onClose={closePreview}
        title={open?.name ?? ""}
        description={open ? t.styles[open.id as keyof typeof t.styles] : undefined}
        className="sm:max-w-3xl"
      >
        {open && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone="accent">{tt.preview}</Badge>
              <Segmented
                label={tt.format}
                size="sm"
                value={videoFormat}
                onChange={setVideoFormat}
                options={FORMAT_IDS.map((id) => ({ value: id, label: VIDEO_FORMATS[id].ratio }))}
              />
            </div>
            {/* `key` : relance la démo à chaque changement de style ou de format */}
            <Player key={`${open.id}-${videoFormat}-${t.locale}`} videoProps={demoVideoProps(open, videoFormat, t.locale)} />
            <p className="text-xs text-subtle">{tt.previewHint}</p>
            {onSelect ? <Button size="lg" className="cursor-pointer self-stretch sm:self-end" onClick={() => { onSelect(open.id); setOpen(null); }}>
              {tt.use} <Check />
            </Button> : <Link href={`/create?style=${open.id}`} className={cn(buttonVariants({ size: "lg" }), "self-stretch sm:self-end")}>
              {tt.use} <ArrowRight />
            </Link>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
