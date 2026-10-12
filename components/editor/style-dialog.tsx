"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorInput } from "@/components/create/color-input";
import { VideoPlaceholder } from "@/components/media/video-placeholder";
import { AnimatedApply } from "@/components/ui/animated-apply";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { VIDEO_STYLES } from "@/config/styles";
import { t } from "@/lib/i18n";
import { changeStyle } from "@/lib/projects/actions";
import type { SceneGraph } from "@/lib/projects/scenes";
import type { EditorProject, EditorVersion } from "@/lib/projects/types";
import { buildVideoProps } from "@/lib/projects/video-props";
import { cn } from "@/lib/utils";
import { Player } from "./player";

const s = t.app.style;

/**
 * Fenêtre « Style » : changer de template et/ou de couleurs, avec aperçu de la vidéo en direct.
 * Le contenu (textes, scènes, médias) est conservé ; une nouvelle version est créée.
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
  const currentStyle = graph.styleId ?? project.styleId ?? VIDEO_STYLES[0].id;
  const currentColors = graph.colors ?? project.colors;
  const [styleId, setStyleId] = useState(currentStyle);
  const [main, setMain] = useState(currentColors[0] ?? "#7c3aed");
  const [accent, setAccent] = useState(currentColors[1] ?? currentColors[0] ?? "#f472b6");
  const [pending, setPending] = useState(false);
  const [applying, setApplying] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const changed = styleId !== currentStyle || main !== currentColors[0] || accent !== (currentColors[1] ?? currentColors[0]);
  const preview = buildVideoProps(project, { ...graph, styleId, colors: [main, accent] }, watermark);

  async function apply() {
    setPending(true);
    try {
      const result = await changeStyle(project.id, { styleId, colors: [main, accent] });
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
    <Dialog open={open} onClose={onClose} title={s.title} description={s.description} className="sm:max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Aperçu en direct de la vidéo avec le style choisi */}
        <div className="flex flex-col gap-2 lg:sticky lg:top-0 lg:self-start">
          <p className="text-sm font-semibold">{s.preview}</p>
          <Player key={`${styleId}-${main}-${accent}`} videoProps={preview} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
        <fieldset disabled={pending || applying} className="contents">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{s.templates}</h3>
            <ul className="grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {VIDEO_STYLES.map((style) => {
                const selected = style.id === styleId;
                return (
                  <li key={style.id}>
                    <button
                      type="button"
                      onClick={() => setStyleId(style.id)}
                      aria-pressed={selected}
                      className={cn("relative block w-full overflow-hidden rounded-xl border-2 text-left transition-colors", selected ? "border-accent" : "border-transparent hover:border-line-strong")}
                    >
                      <VideoPlaceholder ratio="4:5" palette={style.palette} scene={style.recipe.background} label={style.name.split(" ")[0]} paused={!selected} />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pt-4 pb-1.5 text-[11px] font-semibold text-white">{style.name}</span>
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                      {style.id === currentStyle && !selected && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{s.current}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{s.colors}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <ColorInput label={s.main} value={main} onChange={setMain} />
              <ColorInput label={s.accent} value={accent} onChange={setAccent} />
            </div>
          </section>

          </fieldset>
        <AnimatedApply disabled={pending || !changed} onApply={apply} onCancel={onClose} onApplyingChange={setApplying} />
        </div>
      </div>
    </Dialog>
  );
}
