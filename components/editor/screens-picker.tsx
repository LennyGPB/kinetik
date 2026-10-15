"use client";


import { useDictionary } from "@/lib/i18n/use-dictionary";

import { Images } from "lucide-react";
import { useState } from "react";
import { format } from "@/lib/i18n";
import { MAX_SCREEN_COUNT } from "@/lib/projects/scenes";
import { cn } from "@/lib/utils";

/**
 * Choix des captures montrées par une scène « Mockups » : clic dans l'ordre d'apparition, 3 au maximum.
 * « Automatique » = les captures suivantes dans l'ordre du projet (comportement par défaut).
 */
export function ScreensPicker({
  screens,
  value,
  disabled,
  onApply,
  onCancel,
  onManage,
}: {
  screens: { url: string; ratio: number | null }[];
  value: string[] | undefined;
  disabled: boolean;
  onApply: (screens: string[] | null) => void;
  onCancel: () => void;
  onManage?: () => void;
}) {
  const t = useDictionary();

  const tl = t.app.editor.timeline;

  const [picked, setPicked] = useState<string[]>(value?.filter((url) => screens.some((s) => s.url === url)) ?? []);

  function toggle(url: string) {
    setPicked((list) => (list.includes(url) ? list.filter((u) => u !== url) : list.length < MAX_SCREEN_COUNT ? [...list, url] : list));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Images className="size-4 text-accent-text" />
        <p className="text-sm font-semibold">{tl.screensPickTitle}</p>
        <p className="text-xs text-muted">{tl.screensPickHint}</p>
        {onManage && <button type="button" disabled={disabled} onClick={onManage} className="ml-auto min-h-9 rounded-lg border border-line px-3 text-xs font-medium hover:bg-surface-2 disabled:opacity-40">{t.copy["14e155156f7c"]}</button>}
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                className={cn("relative h-28 overflow-hidden rounded-lg border-2 bg-black transition-[border-color,opacity]", order >= 0 ? "border-accent" : "border-transparent opacity-55 hover:opacity-100")}
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
          className="h-10 rounded-xl bg-accent-gradient px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {tl.apply}
        </button>
      </div>
    </div>
  );
}
