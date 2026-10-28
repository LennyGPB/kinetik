"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check } from "lucide-react";
import { getLogoMotion } from "@/config/logo-motion";
import { getProductTemplate } from "@/config/physical-product";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useCallback, useMemo, useState } from "react";
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
import { TemplateHoverPreview } from "@/components/media/template-hover-preview";
import { PopularBadge, useArrangedTemplates } from "@/components/templates/template-settings";
import { PostTemplateGallery } from "@/components/posts/post-template-gallery";
import { StoreTemplateGallery } from "@/components/store/store-template-gallery";
import { storeCopy } from "@/lib/store/copy";
import { postCopy } from "@/lib/posts/copy";
import { DecorGallery } from "@/components/decors/decor-gallery";
import { decorCopy } from "@/lib/decors/copy";
import { isFeatureEnabled } from "@/config/features";
import { CommunityGallery } from "@/components/templates/community-gallery";

type Filter = StyleCategory | "all";

export function TemplatesGallery({ selectedId, onSelect, compact = false, initialKind }: {
  selectedId?: string | null;
  onSelect?: (styleId: string) => void;
  compact?: boolean;
  /** Onglet ouvert à l'arrivée (lien depuis la landing : ?tab=community) */
  initialKind?: string;
}) {
  const t = useDictionary();

  const tt = t.app.templates;
  const router = useRouter();
  const [applying, setApplying] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<"motion" | "logo" | "post" | "store" | "decor" | "product" | "community">(!onSelect && isFeatureEnabled("community") && (!initialKind || initialKind === "community") ? "community" : "motion");
  const [open, setOpen] = useState<VideoStyle | null>(null);
  const [videoFormat, setVideoFormat] = useState<VideoFormatId>("LANDSCAPE");
  const closePreview = useCallback(() => { if (!applying) setOpen(null); }, [applying]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const startHover = (id: string) => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setPlayingId(id);
  };
  const endHover = () => setPlayingId(null);
  // Logo motions have their own creation flow: they get their own tab, and are never offered while picking a style in the classic wizard.
  const productFamily = kind === "product" || Boolean(getProductTemplate(selectedId));
  const catalogKind = productFamily ? "product" : kind === "logo" ? "logo" : "motion";
  const filtered = useMemo(() => VIDEO_STYLES.filter((style) => productFamily ? Boolean(getProductTemplate(style.id)) : !getProductTemplate(style.id) && (kind === "logo" ? Boolean(getLogoMotion(style.id)) : !getLogoMotion(style.id) && (filter === "all" || style.category === filter))), [productFamily, kind, filter]);
  // Réglages admin : templates masqués retirés, populaires en tête (le template déjà choisi reste visible)
  const { items: styles, isPopular } = useArrangedTemplates(catalogKind, filtered, selectedId);

  return (
    <div>
      {!onSelect && <div className="mb-2"><Segmented variant="pills" label={postCopy(t.locale).newContent} value={kind} onChange={(value) => { endHover(); setKind(value); }} options={([{ value: "community" as const, label: t.locale === "fr" ? "Créations communautaires" : "Community creations" }, { value: "motion" as const, label: postCopy(t.locale).motion }, { value: "product", label: t.locale === "fr" ? "Produits physiques" : "Physical products" }, { value: "logo", label: t.styleCategories.logo }, { value: "post", label: postCopy(t.locale).posts }, { value: "store", label: storeCopy(t.locale).kind }, { value: "decor", label: decorCopy(t.locale).title }] as { value: typeof kind; label: string }[]).filter((option) => isFeatureEnabled(option.value === "logo" ? "signature" : option.value))} /></div>}
      {kind === "community" ? <CommunityGallery /> : kind === "decor" ? <DecorGallery /> : kind === "store" ? <StoreTemplateGallery /> : kind === "post" ? <PostTemplateGallery /> : <>
      <div className={cn("flex flex-col gap-4", !compact && "sm:flex-row sm:items-center sm:justify-between")}>
        {kind === "logo" || productFamily ? <span /> : <div className="min-w-0 overflow-x-auto scrollbar-none">
          <Segmented
            variant="pills"
            label={tt.title}
            size="sm"
            value={filter}
            onChange={(value) => { endHover(); setFilter(value); }}
            options={(["all", ...STYLE_CATEGORIES] as Filter[]).map((value) => ({ value, label: t.styleCategories[value] }))}
          />
        </div>}
        <p className="shrink-0 text-sm text-subtle">{format(tt.count, { count: styles.length })}</p>
      </div>

      <motion.ul layout className={cn("mt-6 grid grid-cols-2 gap-3 sm:gap-4", compact ? "sm:grid-cols-3" : "md:grid-cols-3 xl:grid-cols-4")}>
        <AnimatePresence mode="popLayout">
          {styles.map((style) => (
            <motion.li
              key={style.id}
              layout
              // La carte survolée passe devant ses voisines (sa prévisu les recouvre en s’élargissant)
              className={cn("relative", playingId === style.id && "z-20")}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            >
              {/* Le cadre porte la prévisu : elle déborde de la carte en s’élargissant (le bouton, lui, coupe ce qui dépasse) */}
              <div className="relative">
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
                <VideoPlaceholder ratio="fill" palette={style.palette} templateId={style.id} scene={style.recipe.background} label={getLogoMotion(style.id) ? undefined : style.name.split(" ")[0]} />
                {isPopular(style.id) && <PopularBadge className="absolute top-2.5 left-2.5" />}
                {selectedId === style.id && <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-accent text-accent-fg"><Check className="size-4" aria-hidden /></span>}
              </button>
              {playingId === style.id && <TemplateHoverPreview style={style} locale={t.locale} grow={1.3} />}
              </div>
              {/* Nom du template : les vignettes graphiques montrent un mot d’exemple, pas le nom */}
              <p className="mt-2 truncate px-1 text-sm font-medium">{style.name}</p>
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
              <div className="flex items-center gap-3"><Badge tone="accent">{t.styleCategories[getLogoMotion(open.id) ? "logo" : open.category]}</Badge><span className="flex gap-1.5" aria-hidden>{open.palette.map((color, index) => <span key={index} className="size-4 rounded-full ring-1 ring-white/20" style={{ background: color }} />)}</span></div>
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
                  else router.push(getProductTemplate(open.id) ? `/create?kind=product&style=${open.id}` : `/create?style=${open.id}`);
                }} />
            </div>
          </div>
        )}
      </Dialog>
      </>}
    </div>
  );
}
