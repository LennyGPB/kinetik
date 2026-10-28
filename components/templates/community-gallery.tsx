"use client";

import { useEffect, useState, useTransition } from "react";
import { Player as RemotionPlayer, Thumbnail } from "@remotion/player";
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
import Link from "@/lib/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Preview = NonNullable<Awaited<ReturnType<typeof getCommunityPreview>>>;
/** Code des vidéos déjà ouvertes (survol puis clic : un seul chargement) */
const previews = new Map<string, Promise<Preview | null>>();
function loadPreview(id: string) {
  if (!previews.has(id)) previews.set(id, getCommunityPreview(id));
  return previews.get(id)!;
}

/** Phrase d'accroche de l'onglet « Créations » (galerie de l'app et landing). */
export function communityIntro(fr: boolean) {
  return fr
    ? <>Des créations <strong className="font-semibold text-fg">100 % originales</strong>, signées Kinetik ou la communauté :<br />utilisables en 1 clic et faciles à personnaliser.</>
    : <><strong className="font-semibold text-fg">100% original</strong> creations by Kinetik and the community:<br />ready in one click and easy to customize.</>;
}

/**
 * Format de chaque carte sur la landing, pour une grille variée comme les autres templates.
 * Motif portrait, paysage, paysage, portrait, carré, paysage, paysage : sur 3 colonnes, les hauteurs s'équilibrent.
 */
const LANDING_SHAPES: VideoFormatId[] = ["PORTRAIT", "LANDSCAPE", "LANDSCAPE", "PORTRAIT", "SQUARE", "LANDSCAPE", "LANDSCAPE"];
function landingShape(item: CommunityTemplate, index: number): VideoFormatId {
  const wanted = LANDING_SHAPES[index % LANDING_SHAPES.length];
  return item.formats.includes(wanted) ? wanted : item.formats.includes("PORTRAIT") ? "PORTRAIT" : item.formats[0];
}

/**
 * Taille de rendu des vignettes : les cartes sont en 2:3, comme les vignettes des autres templates.
 * Une vidéo portrait est rendue directement en 2:3 (le code reçoit width/height et se met en page) pour ne rien rogner.
 */
function cardDimensions(format: VideoFormatId) {
  return format === "PORTRAIT" ? { width: 1080, height: 1620 } : DIMENSIONS[format];
}

/**
 * Onglet « Créations » : vidéos écrites avec Claude privé et publiées depuis l'admin.
 * Avec signUpHref (landing, visiteur non connecté) : chaque carte mène à l'inscription au lieu d'ouvrir la fiche.
 */
export function CommunityGallery({ signUpHref, showIntro = true }: { signUpHref?: string; showIntro?: boolean } = {}) {
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

  const gradient = (item: CommunityTemplate) => `linear-gradient(150deg, ${item.palette[0]}, ${item.palette[1] ?? item.palette[0]} 60%, ${item.palette[2] ?? item.palette[1] ?? item.palette[0]})`;
  const visual = (item: CommunityTemplate, shape?: VideoFormatId) => (
    hovered?.id === item.id ? (
      <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden bg-black">
        <HoverPlayer props={customPreviewProps(hovered.preview.runtime, hovered.preview.demo, shape ?? (item.formats.includes("PORTRAIT") ? "PORTRAIT" : item.formats[0]), locale)} />
      </div>
    ) : item.thumbnail && (!shape || shape === "PORTRAIT") ? (
      // eslint-disable-next-line @next/next/no-img-element -- image publique servie par /api/uploads
      <img src={item.thumbnail} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
    ) : (
      <LiveThumbnail item={item} locale={locale} format={shape} />
    )
  );

  // Landing : mêmes cartes que les autres templates (colonnes, nom et infos sur l'image, badge), clic → inscription
  if (signUpHref) {
    return (
      <div className="mx-auto mt-8 w-full max-w-5xl columns-2 gap-3 sm:gap-4 md:columns-3">
        {items.map((item, index) => {
          const shape = landingShape(item, index);
          return (
          <div key={item.id} className="mb-3 break-inside-avoid sm:mb-4">
            <Link
              href={signUpHref}
              onMouseEnter={() => hover(item.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => hover(item.id)}
              onBlur={() => setHovered(null)}
              className="group relative block overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-[0_20px_50px_-20px_var(--accent-glow)] sm:rounded-3xl"
            >
              <div className={cn("relative overflow-hidden", shape === "LANDSCAPE" ? "aspect-video" : shape === "SQUARE" ? "aspect-square" : "aspect-[2/3]")} style={{ background: gradient(item) }}>
                <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">{visual(item, shape)}</div>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-white sm:text-lg">{item.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/70 max-sm:hidden">{fr ? `${item.scenes} scènes · ${item.seconds} s · modifiable en 1 clic` : `${item.scenes} scenes · ${item.seconds}s · edit in one click`}</p>
                  </div>
                  <span className="grid size-8 shrink-0 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    <ArrowUpRight className="size-4" />
                    <span className="sr-only">{t.landing.gallery.use}</span>
                  </span>
                </div>
              </div>
              {item.popular
                ? <PopularBadge className="absolute top-2.5 left-2.5 z-20 sm:top-3 sm:left-3" />
                : <Badge tone="glass" className="absolute top-2.5 left-2.5 z-20 sm:top-3 sm:left-3">{fr ? "Créations" : "Creations"}</Badge>}
            </Link>
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {showIntro && <p className="mt-1 text-sm text-muted">{communityIntro(fr)}</p>}
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const tile = {
            onMouseEnter: () => hover(item.id),
            onMouseLeave: () => setHovered(null),
            className: "relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
            style: { background: gradient(item) },
          };
          const content = <>
              {visual(item)}
              {item.popular && <PopularBadge className="absolute top-2.5 left-2.5" />}
          </>;
          return (
            <li key={item.id}>
              {signUpHref
                ? <Link href={signUpHref} aria-label={item.name} {...tile}>{content}</Link>
                : <button type="button" onClick={() => openItem(item)} {...tile}>{content}</button>}
              <p className="mt-2 truncate px-1 text-sm font-medium">{item.name}</p>
            </li>
          );
        })}
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

/**
 * Miniature automatique quand le studio n'en a pas : une image de la démo, prise au milieu de la scène
 * qui couvre 40 % de la vidéo (jamais pendant une transition). Calculée dans le navigateur, sans rendu serveur.
 */
function LiveThumbnail({ item, locale, format: wanted }: { item: CommunityTemplate; locale: "fr" | "en"; format?: VideoFormatId }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    let alive = true;
    loadPreview(item.id).then((loaded) => { if (alive) setPreview(loaded); }).catch(() => undefined);
    return () => { alive = false; };
  }, [item.id]);
  if (!preview) return <span className="absolute inset-x-3 bottom-3 text-lg font-bold text-white drop-shadow">{item.name}</span>;
  const format = wanted ?? (item.formats.includes("PORTRAIT") ? "PORTRAIT" : item.formats[0]);
  const props = customPreviewProps(preview.runtime, preview.demo, format, locale);
  const total = durationInFrames(props.graph);
  let from = 0;
  let frame = Math.round(total * 0.4);
  for (const scene of props.graph.scenes) {
    const length = scene.duration * FPS;
    if (from + length > total * 0.4) { frame = Math.round(from + length * 0.55); break; }
    from += length;
  }
  const { width, height } = cardDimensions(format);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
      <Thumbnail component={KinetikVideo} inputProps={props} durationInFrames={total} frameToDisplay={Math.min(total - 1, frame)} compositionWidth={width} compositionHeight={height} fps={FPS}
        style={width < height ? { width: "100%", height: "100%" } : { height: "100%", aspectRatio: `${width} / ${height}`, flexShrink: 0 }} />
    </div>
  );
}

/** Prévisu muette au survol d'une carte (vidéo seule, sans contrôles). */
function HoverPlayer({ props }: { props: VideoProps }) {
  const { width, height } = cardDimensions(props.format);
  return <RemotionPlayer component={KinetikVideo} inputProps={props} durationInFrames={durationInFrames(props.graph)} compositionWidth={width} compositionHeight={height} fps={FPS} autoPlay loop initiallyMuted controls={false} style={width < height ? { width: "100%", height: "100%" } : { width: "100%", aspectRatio: `${width} / ${height}` }} />;
}
