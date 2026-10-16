"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { ArrowRight, Check, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "@/lib/i18n/navigation";
import { Player as RemotionPlayer } from "@remotion/player";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";

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
  // Survol : la démo démarre après un court délai (pas de lecteur lancé pour un simple passage de souris)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startHover = (id: string) => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setPlayingId(id), 350); };
  const endHover = () => { clearTimeout(hoverTimer.current); setPlayingId(null); };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
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
                onClick={() => { endHover(); setOpen(style); }}
                onMouseEnter={() => startHover(style.id)}
                onMouseLeave={endHover}
                aria-label={format(t.copy["e0e8865ec0d0"], { p0: style.name, p1: selectedId === style.id ? t.copy["5bc7b547e31e"] : "" })}
                // Halo et contour au survol : couleur d'accent du template
                style={{ "--glow": style.palette[2] } as CSSProperties}
                className={cn(
                  "group relative block w-full cursor-pointer overflow-hidden rounded-[1.75rem] border bg-surface p-2 text-left transition-[border-color,box-shadow,transform] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-24px_var(--glow)]",
                  selectedId === style.id ? "border-accent ring-1 ring-accent" : "border-line hover:border-[color:var(--glow)]",
                )}
              >
                {/* Vignette encadrée : posée dans la carte avec sa marge et ses propres arrondis */}
                <div className="relative overflow-hidden rounded-[1.25rem]">
                  <div className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105">
                    <VideoPlaceholder ratio="4:5" palette={style.palette} templateId={style.id} scene={style.recipe.background} label={style.name.split(" ")[0]} />
                  </div>
                  {playingId === style.id && <HoverDemo style={style} locale={t.locale} />}
                  {/* Reflet verre en haut de la vignette */}
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent" />
                  {/* Liseré du cadre, au-dessus de la vignette et de la démo */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset" />
                  <span className={cn("absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-xl transition-all duration-300", playingId === style.id ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100")}>
                    <Play className="size-3.5 fill-current" /> {tt.preview}
                  </span>
                  <Badge tone="glass" className="absolute top-3 left-3">
                    {t.styleCategories[style.category]}
                  </Badge>
                  {selectedId === style.id && <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-4" aria-hidden /></span>}
                </div>
                <div className="px-2.5 pt-3.5 pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-display text-lg font-semibold">{style.name}</p>
                    {/* Palette du template */}
                    <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                      {style.palette.map((color, index) => (
                        <span key={index} className="size-4 rounded-full ring-2 ring-surface" style={{ background: color }} />
                      ))}
                    </span>
                  </div>
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

/** Démo réelle du template, jouée dans la vignette au survol (carré recadré pour couvrir le 4:5). */
function HoverDemo({ style, locale }: { style: VideoStyle; locale: "fr" | "en" }) {
  const props = demoVideoProps(style, "SQUARE", locale);
  const { width, height } = DIMENSIONS.SQUARE;
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className="absolute inset-y-0 left-1/2 aspect-square h-full -translate-x-1/2">
        <RemotionPlayer
          component={KinetikVideo}
          inputProps={props}
          compositionWidth={width}
          compositionHeight={height}
          durationInFrames={durationInFrames(props.graph)}
          fps={FPS}
          autoPlay
          loop
          controls={false}
          clickToPlay={false}
          initiallyMuted
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </motion.div>
  );
}
