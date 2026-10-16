"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { Player as RemotionPlayer, type PlayerRef } from "@remotion/player";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Player } from "@/components/editor/player";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { Badge } from "@/components/ui/badge";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { FORMAT_IDS, VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { STYLE_CATEGORIES, VIDEO_STYLES, type StyleCategory, type VideoStyle } from "@/config/styles";
import { format } from "@/lib/i18n";
import { demoVideoProps } from "@/lib/projects/demo-video";
import { cn } from "@/lib/utils";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { DIMENSIONS, durationInFrames, FPS } from "@/remotion/props";
import { PostTemplateGallery } from "@/components/posts/post-template-gallery";
import { postCopy } from "@/lib/posts/copy";

type Filter = StyleCategory | "all";

export function TemplatesGallery({ selectedId, onSelect, compact = false }: {
  selectedId?: string | null;
  onSelect?: (styleId: string) => void;
  compact?: boolean;
}) {
  const t = useDictionary();

  const tt = t.app.templates;
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<"motion" | "post">("motion");
  const [open, setOpen] = useState<VideoStyle | null>(null);
  const [videoFormat, setVideoFormat] = useState<VideoFormatId>("LANDSCAPE");
  const closePreview = useCallback(() => { if (!applying) setOpen(null); }, [applying]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const startHover = (id: string) => setPlayingId(id);
  const endHover = () => setPlayingId(null);
  const styles = filter === "all" ? VIDEO_STYLES : VIDEO_STYLES.filter((s) => s.category === filter);

  return (
    <div>
      {!onSelect && <div className="mb-6"><Segmented label={postCopy(t.locale).newContent} value={kind} onChange={(value) => { endHover(); setKind(value); }} options={[{ value: "motion", label: postCopy(t.locale).motion }, { value: "post", label: postCopy(t.locale).posts }]} /></div>}
      {kind === "post" ? <PostTemplateGallery /> : <>
      <div className={cn("flex flex-col gap-4", !compact && "sm:flex-row sm:items-center sm:justify-between")}>
        <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          <Segmented
            label={tt.title}
            size="sm"
            value={filter}
            onChange={(value) => { endHover(); setFilter(value); }}
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
                onFocus={() => startHover(style.id)}
                onBlur={endHover}
                className={cn("relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent", selectedId === style.id && "ring-2 ring-accent")}
              >
                <VideoPlaceholder ratio="fill" palette={style.palette} templateId={style.id} scene={style.recipe.background} label={style.name.split(" ")[0]} />
                {playingId === style.id && <HoverDemo style={style} locale={t.locale} />}
                {selectedId === style.id && <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-4" aria-hidden /></span>}
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
        className="overflow-x-hidden bg-bg sm:max-w-4xl sm:p-7"
      >
        {open && (
          <div className="flex flex-col gap-5">
            <fieldset disabled={applying} className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3"><Badge tone="accent">{t.styleCategories[open.category]}</Badge><span className="flex gap-1.5" aria-hidden>{open.palette.map((color, index) => <span key={index} className="size-4 rounded-full ring-1 ring-white/20" style={{ background: color }} />)}</span></div>
              <Segmented
                label={tt.format}
                size="sm"
                value={videoFormat}
                onChange={setVideoFormat}
                options={FORMAT_IDS.map((id) => ({ value: id, label: VIDEO_FORMATS[id].ratio }))}
              />
            </fieldset>
            {/* `key` : relance la démo à chaque changement de style ou de format */}
            <Player preview key={`${open.id}-${videoFormat}-${t.locale}`} videoProps={demoVideoProps(open, videoFormat, t.locale)} />
            <div className="grid items-center gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_minmax(0,25rem)]">
              <p className="max-w-sm text-xs leading-relaxed text-muted">{tt.previewHint}</p>
              <AnimatedApply key={open.id} variant="purple" label={tt.use} icon={onSelect ? <Check /> : undefined}
                onApplyingChange={setApplying} onCancel={closePreview}
                onApply={() => {
                  if (onSelect) { onSelect(open.id); setOpen(null); setApplying(false); }
                  else router.push(`/create?style=${open.id}`);
                }} />
            </div>
          </div>
        )}
      </Dialog>
      </>}
    </div>
  );
}

/** One active, muted player; explicit dimensions keep its square viewport measurable. */
function HoverDemo({ style, locale }: { style: VideoStyle; locale: "fr" | "en" }) {
  const props = useMemo(() => demoVideoProps(style, "SQUARE", locale), [style, locale]);
  const playerRef = useRef<PlayerRef>(null);
  useLayoutEffect(() => {
    playerRef.current?.play();
  }, []);
  const { width, height } = DIMENSIONS.SQUARE;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 h-full w-[150%] -translate-x-1/2">
        <RemotionPlayer
          ref={playerRef}
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
    </div>
  );
}
