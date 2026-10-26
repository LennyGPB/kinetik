"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Check, ImagePlus, Wand2 } from "lucide-react";
import { useState } from "react";
import { format } from "@/lib/i18n";
import { MAX_SCREEN_COUNT } from "@/lib/projects/scenes";
import { cn } from "@/lib/utils";

/**
 * Choix des captures : jusqu'à 3 sur une scène « Mockups », une seule pour les autres scènes 3D.
 * « Automatique » rétablit le comportement du template (rotation des captures ou écran d'accueil).
 */
export function ScreensPicker({
  screens,
  value,
  disabled,
  onApply,
  onCancel,
  onManage,
  maxCount = MAX_SCREEN_COUNT,
}: {
  screens: { url: string; ratio: number | null }[];
  value: string[] | undefined;
  disabled: boolean;
  onApply: (screens: string[] | null) => void;
  onCancel: () => void;
  onManage?: () => void;
  maxCount?: number;
}) {
  const t = useDictionary();

  const tl = t.app.editor.timeline;

  const limit = maxCount === 1 ? 1 : MAX_SCREEN_COUNT;
  const [picked, setPicked] = useState<string[]>(value?.filter((url) => screens.some((s) => s.url === url)).slice(0, limit) ?? []);

  function toggle(url: string) {
    setPicked((list) => (list.includes(url) ? list.filter((u) => u !== url) : limit === 1 ? [url] : list.length < limit ? [...list, url] : list));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-muted">{limit === 1 ? tl.mockupScreenHint : tl.screensPickHint}</p>
        {limit > 1 && (
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", picked.length ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-muted")}>
            {picked.length}/{limit}
          </span>
        )}
      </div>

      {/* Grille régulière (pas de défilement horizontal caché) : chaque capture reste atteignable à la souris. */}
      <ul className="grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
        {screens.map((screen, i) => {
          const order = picked.indexOf(screen.url);
          const selected = order >= 0;
          return (
            <li key={screen.url}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(screen.url)}
                aria-pressed={selected}
                aria-label={format(tl.screenItem, { n: i + 1 })}
                className={cn(
                  "relative block aspect-[9/16] w-full overflow-hidden rounded-xl border-2 bg-black transition-[border-color,opacity,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97] disabled:opacity-40 motion-reduce:transition-none",
                  selected ? "border-accent shadow-[0_0_0_4px_rgb(139_92_246/0.18)]" : "border-line opacity-70 hover:border-line-strong hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier uploadé servi par /api/uploads */}
                <img src={screen.url} alt="" className="size-full object-contain" />
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2 left-2 grid size-6 place-items-center rounded-full text-xs font-bold",
                    selected ? "bg-accent text-white" : "border border-white/40 bg-black/40",
                  )}
                >
                  {selected ? (limit === 1 ? <Check className="size-3.5" /> : order + 1) : null}
                </span>
              </button>
            </li>
          );
        })}
        {onManage && (
          <li>
            <button
              type="button"
              disabled={disabled}
              onClick={onManage}
              className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-2 text-center text-xs font-medium text-muted transition-colors hover:border-accent/60 hover:bg-accent-soft hover:text-accent-text disabled:opacity-40"
            >
              <span className="grid size-9 place-items-center rounded-full bg-surface-2"><ImagePlus className="size-4" aria-hidden /></span>
              {t.copy["14e155156f7c"]}
            </button>
          </li>
        )}
      </ul>

      <div className="-mx-6 mt-1 flex flex-wrap items-center gap-2 border-t border-line px-6 pt-4">
        <button type="button" disabled={disabled} onClick={() => onApply(null)} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40">
          <Wand2 className="size-4" aria-hidden />
          {tl.screensAuto}
        </button>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="h-11 rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            {tl.cancel}
          </button>
          <button
            type="button"
            disabled={disabled || !picked.length}
            onClick={() => onApply(picked)}
            className={cn("h-11 rounded-xl px-5 text-sm font-semibold transition-[opacity,box-shadow] disabled:opacity-40", purpleButtonStyle)}
          >
            {tl.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
