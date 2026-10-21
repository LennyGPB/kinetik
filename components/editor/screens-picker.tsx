"use client";

import { purpleButtonStyle } from "@/components/ui/button";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Images } from "lucide-react";
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
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Images className="size-4 text-accent-text" />
        <p className="text-sm font-semibold">{tl.screensPickTitle}</p>
        <p className="text-xs text-muted">{limit === 1 ? tl.mockupScreenHint : tl.screensPickHint}</p>
        {onManage && <button type="button" disabled={disabled} onClick={onManage} className="ml-auto min-h-9 rounded-lg border border-line px-3 text-xs font-medium hover:bg-surface-2 disabled:opacity-40">{t.copy["14e155156f7c"]}</button>}
      </div>
      {/* Wrapping grid, not a hidden horizontal scroller: every screenshot stays reachable with a mouse (8 at most). */}
      <ul className="flex max-h-[50vh] flex-wrap gap-2 overflow-y-auto p-0.5">
        {screens.map((screen, i) => {
          const order = picked.indexOf(screen.url);
          return (
            <li key={screen.url} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(screen.url)}
                aria-pressed={order >= 0}
                aria-label={format(tl.screenItem, { n: i + 1 })}
                className={cn("relative h-24 max-w-full overflow-hidden rounded-lg border-2 bg-black transition-[border-color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-28", order >= 0 ? "border-accent" : "border-transparent opacity-55 hover:opacity-100")}
                style={{ aspectRatio: `${screen.ratio ?? 9 / 19.5}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier uploadé servi par /api/uploads */}
                <img src={screen.url} alt="" className="size-full object-contain" />
                {order >= 0 && <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{order + 1}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={disabled} onClick={() => onApply(null)} className="h-10 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg">
          {tl.screensAuto}
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg">
          {tl.cancel}
        </button>
        <button
          type="button"
          disabled={disabled || !picked.length}
          onClick={() => onApply(picked)}
          className={cn("h-10 rounded-xl px-4 text-sm transition-[opacity,box-shadow] disabled:opacity-40", purpleButtonStyle)}
        >
          {tl.apply}
        </button>
      </div>
    </div>
  );
}
