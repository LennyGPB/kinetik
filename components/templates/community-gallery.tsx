"use client";

import { useEffect, useState, useTransition } from "react";
import { Player as RemotionPlayer } from "@remotion/player";
import { Player } from "@/components/editor/player";
import { DIMENSIONS, durationInFrames, FPS, type VideoProps } from "@/remotion/props";
import { KinetikVideo } from "@/remotion/video/KinetikVideo";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { PopularBadge } from "@/components/templates/template-settings";
import { VIDEO_FORMATS, type VideoFormatId } from "@/config/formats";
import { createCommunityProject, getCommunityPreview, listCommunity } from "@/lib/custom-motion/actions";
import { customPreviewProps } from "@/lib/custom-motion/graph";
import type { CommunityTemplate } from "@/lib/custom-motion/queries";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";

type Preview = NonNullable<Awaited<ReturnType<typeof getCommunityPreview>>>;
/** Code des vidéos déjà ouvertes (survol puis clic : un seul chargement) */
const previews = new Map<string, Promise<Preview | null>>();
function loadPreview(id: string) {
  if (!previews.has(id)) previews.set(id, getCommunityPreview(id));
  return previews.get(id)!;
}

/** Onglet « Créations » : vidéos écrites avec Claude privé et publiées depuis l'admin. */
export function CommunityGallery() {
  const t = useDictionary();
  const fr = t.locale === "fr";
  const locale = fr ? "fr" : "en";
  const [items, setItems] = useState<CommunityTemplate[] | null>(null);
  const [hovered, setHovered] = useState<{ id: string; preview: Preview } | null>(null);
  const [open, setOpen] = useState<{ item: CommunityTemplate; preview: Preview | null } | null>(null);
  const [format, setFormat] = useState<VideoFormatId>("LANDSCAPE");
  const [applying, setApplying] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => { listCommunity().then(setItems).catch(() => setItems([])); }, []);

  const hover = (id: string) => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    loadPreview(id).then((preview) => preview && setHovered((current) => (current?.id === id || !current ? { id, preview } : current)));
  };

  const openItem = (item: CommunityTemplate) => {
    setHovered(null);
    setFormat(item.formats.includes("LANDSCAPE") ? "LANDSCAPE" : item.formats[0]);
    setOpen({ item, preview: null });
    loadPreview(item.id).then((preview) => setOpen((current) => (current?.item.id === item.id ? { item, preview } : current)));
  };

  if (!items) return <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2" />)}</div>;
  if (!items.length) return <p className="mt-10 text-center text-sm text-muted">{fr ? "Aucune vidéo Créations pour l’instant. Reviens bientôt !" : "No community videos yet. Check back soon!"}</p>;

  return (
    <div>
      <p className="mt-1 text-sm text-muted">{fr ? "Des animations créées sur mesure. Change les textes, les couleurs, la musique et la durée des scènes." : "Custom-made animations. Change the text, colours, music and scene lengths."}</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => openItem(item)}
              onMouseEnter={() => hover(item.id)}
              onMouseLeave={() => setHovered(null)}
              className="relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              style={{ background: `linear-gradient(150deg, ${item.palette[0]}, ${item.palette[1] ?? item.palette[0]} 60%, ${item.palette[2] ?? item.palette[1] ?? item.palette[0]})` }}
            >
              {hovered?.id === item.id ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black">
                  <HoverPlayer props={customPreviewProps(hovered.preview.runtime, hovered.preview.demo, item.formats.includes("PORTRAIT") ? "PORTRAIT" : item.formats[0], locale)} />
                </div>
              ) : item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- image publique servie par /api/uploads
                <img src={item.thumbnail} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="absolute inset-x-3 bottom-3 text-lg font-bold text-white drop-shadow">{item.name}</span>
              )}
              {item.popular && <PopularBadge className="absolute top-2.5 left-2.5" />}
            </button>
            <p className="mt-2 truncate px-1 text-sm font-medium">{item.name}</p>
          </li>
        ))}
      </ul>

      <Dialog open={Boolean(open)} onClose={() => { if (!applying) setOpen(null); }} title={open?.item.name ?? ""} className="overflow-x-hidden bg-bg sm:max-w-4xl sm:p-7">
        {open && (
          <div className="flex flex-col gap-5">
            <fieldset disabled={applying} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <span className="flex gap-1.5" aria-hidden>{open.item.palette.map((color, i) => <span key={i} className="size-4 rounded-full ring-1 ring-white/20" style={{ background: color }} />)}</span>
              {open.item.formats.length > 1 && (
                <Segmented label={t.app.templates.format} size="sm" value={format} onChange={setFormat} options={open.item.formats.map((id) => ({ value: id, label: VIDEO_FORMATS[id].ratio }))} />
              )}
            </fieldset>
            {open.preview
              ? <Player preview key={`${open.item.id}-${format}`} videoProps={customPreviewProps(open.preview.runtime, open.preview.demo, format, locale)} />
              : <div className={cn("w-full animate-pulse rounded-3xl bg-surface-2", format === "LANDSCAPE" ? "aspect-video" : format === "SQUARE" ? "aspect-square max-w-md self-center" : "aspect-[9/16] max-w-xs self-center")} />}
            <div className="grid items-center gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_minmax(0,25rem)]">
              <p className="max-w-sm text-xs leading-relaxed text-muted">{fr ? "Tu pourras changer les textes, les couleurs, la musique et la durée des scènes. Création gratuite." : "You can change the text, colours, music and scene lengths. Free to create."}</p>
              <AnimatedApply variant="purple" label={t.app.templates.use} onApplyingChange={setApplying} onCancel={() => setOpen(null)} onApply={async () => {
                const result = await createCommunityProject(open.item.id, format);
                if (result && !result.ok) {
                  setApplying(false);
                  startTransition(() => toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" }));
                }
              }} />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** Prévisu muette au survol d'une carte (vidéo seule, sans contrôles). */
function HoverPlayer({ props }: { props: VideoProps }) {
  const { width, height } = DIMENSIONS[props.format];
  return <RemotionPlayer component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(props.graph)} compositionWidth={width} compositionHeight={height} fps={FPS} autoPlay loop initiallyMuted controls={false} style={{ width: "100%", aspectRatio: `${width} / ${height}` }} />;
}
