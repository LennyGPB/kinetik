"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { ColorInput } from "@/components/create/color-input";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toaster";
import { getStyle, STYLE_CATEGORIES, VIDEO_STYLES, type StyleCategory } from "@/config/styles";
import { LIQUID_TEMPLATES, getProductTemplate } from "@/config/physical-product";
import { getLogoMotion } from "@/config/logo-motion";
import { MAX_PROJECT_COLORS } from "@/config/colors";
import { format } from "@/lib/i18n";
import { changeStyle } from "@/lib/projects/actions";
import type { SceneGraph } from "@/lib/projects/scenes";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import { buildVideoProps } from "@/lib/projects/video-props";
import { cn } from "@/lib/utils";
import { Player } from "./player";

type Filter = StyleCategory | "all";

/**
 * Fenêtre « Style » : changer de template et/ou de couleurs, avec aperçu de la vidéo en direct.
 * Le contenu (textes, scènes, médias) est conservé ; une nouvelle version est créée.
 * Gauche : aperçu puis couleurs. Droite : templates filtrables sur toute la hauteur. Appliquer en bas, sur toute la largeur.
 */
export function StyleDialog({
  open,
  onClose,
  project,
  graph,
  watermark,
  onVersion,
}: {
  open: boolean;
  onClose: () => void;
  project: EditorProject;
  /** Dernière version (base de l'aperçu) */
  graph: SceneGraph;
  watermark: boolean;
  onVersion: (version: EditorVersion) => void;
}) {
  const t = useDictionary();

  const s = t.app.style;

  const currentStyle = graph.styleId ?? project.styleId ?? VIDEO_STYLES[0].id;
  const currentColors = graph.colors ?? project.colors;
  const [styleId, setStyleId] = useState(currentStyle);
  const [colors, setColors] = useState<string[]>(() => currentColors.length ? currentColors.slice(0, MAX_PROJECT_COLORS) : ["#7c3aed", "#f472b6"]);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const changed = styleId !== currentStyle || colors.length !== currentColors.length || colors.some((color, i) => color !== currentColors[i]);
  const preview = buildVideoProps(project, { ...graph, styleId, colors }, watermark);
  const style = getStyle(styleId);
  // Signatures et templates motion sont deux familles distinctes : on ne propose que celle du projet
  const logoProject = Boolean(getLogoMotion(currentStyle));
  const productProject = Boolean(getProductTemplate(currentStyle));
  const family = VIDEO_STYLES.filter((item) => Boolean(getProductTemplate(item.id)) === productProject && Boolean(getLogoMotion(item.id)) === logoProject);
  const styles = filter === "all" ? family : family.filter((item) => item.category === filter);
  // Couleurs d'origine du template choisi ([fond, principale, accent] → principale + accent)
  const templateColors = style ? productProject ? [...style.palette] : [style.palette[1], style.palette[2]] : null;
  const usesTemplateColors = Boolean(templateColors && colors.length === 2 && colors.every((color, i) => color.toLowerCase() === templateColors[i].toLowerCase()));

  // À l'ouverture, la grille défile jusqu'au template actuel
  const selectedRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  async function apply() {
    setPending(true);
    try {
      const result = await changeStyle(project.id, { styleId, colors });
      if (!result.ok) return toast({ title: result.error === "rate_limited" ? t.app.editor.rateLimited : t.common.error, tone: "error" });
      onVersion(result.version);
      router.refresh();
      toast({ title: s.applied, tone: "success" });
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={s.title} description={s.description} className="sm:max-w-6xl">
      <div className="flex flex-col gap-6">
      <fieldset disabled={pending || applying} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Gauche : aperçu en direct, puis les couleurs */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{s.preview}</h3>
              {style && (
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium">
                  <span className="flex -space-x-1" aria-hidden>
                    {colors.slice(0, 3).map((color, i) => <span key={i} className="size-2.5 rounded-full ring-1 ring-bg" style={{ background: color }} />)}
                  </span>
                  {style.name}
                </span>
              )}
            </div>
            <Player key={`${styleId}-${colors.join("-")}`} videoProps={preview} />
          </section>

          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{s.colors} <span className="ml-1 text-xs font-normal text-muted" aria-live="polite">{colors.length}/{MAX_PROJECT_COLORS}</span></h3>
              {templateColors && (
                <button type="button" disabled={usesTemplateColors} onClick={() => setColors(templateColors)} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-text transition-opacity hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-40">
                  <RotateCcw className="size-3.5" /> {s.templateColors}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {colors.map((color, i) => (
                <ColorInput
                  key={i}
                  label={i === 0 ? s.main : i === 1 ? s.accent : i === 2 && LIQUID_TEMPLATES.includes(styleId) ? s.liquidColor : format(s.additionalColor, { n: i + 1 })}
                  value={color}
                  onChange={(value) => setColors((list) => list.map((item, index) => index === i ? value : item))}
                  onRemove={i > 0 ? () => setColors((list) => list.filter((_, index) => index !== i)) : undefined}
                />
              ))}
              {colors.length < MAX_PROJECT_COLORS && (
                <button type="button" onClick={() => setColors((list) => list.length < MAX_PROJECT_COLORS ? [...list, "#7c3aed"] : list)} className="inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <Plus className="size-4" />{s.addColor}
                </button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-subtle">{s.colorsHelp}</p>
          </section>
        </div>

        {/* Droite : templates, filtrables par catégorie */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{s.templates}</h3>
            <span className="text-xs text-muted">{format(t.app.templates.count, { count: styles.length })}</span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
            <Segmented label={s.templates} size="sm" value={filter} onChange={setFilter} options={(["all", ...STYLE_CATEGORIES] as Filter[]).map((value) => ({ value, label: t.styleCategories[value] }))} />
          </div>
          <ul className="grid max-h-[24rem] grid-cols-3 content-start gap-2.5 overflow-y-auto p-0.5 sm:grid-cols-4 lg:max-h-[min(64dvh,40rem)]">
            {styles.map((item) => {
              const selected = item.id === styleId;
              return (
                <li key={item.id} ref={item.id === currentStyle ? selectedRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setStyleId(item.id)}
                    aria-pressed={selected}
                    className={cn("group relative block w-full overflow-hidden rounded-xl text-left ring-2 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5", selected ? "ring-accent" : "ring-transparent hover:ring-line-strong")}
                  >
                    <VideoPlaceholder ratio="4:5" palette={item.palette} templateId={item.id} scene={item.recipe.background} label={item.name.split(" ")[0]} paused={!selected} />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pt-5 pb-1.5 text-[11px] font-semibold text-white">{item.name}</span>
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-white shadow-lg">
                        <Check className="size-3" />
                      </span>
                    )}
                    {item.id === currentStyle && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">{s.current}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </fieldset>
      <AnimatedApply disabled={pending || !changed} onApply={apply} onCancel={onClose} onApplyingChange={setApplying} />
      </div>
    </Dialog>
  );
}
