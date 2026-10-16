"use client";

import { useDictionary } from "@/lib/i18n/use-dictionary";
import { format } from "@/lib/i18n";
import { formatSeconds, TEXT_END_MIN } from "@/lib/projects/timeline";
import { cn } from "@/lib/utils";

/**
 * Durée d'affichage d'un texte dans sa scène : barre pleine = visible jusqu'à la fin ;
 * on la raccourcit pour faire disparaître le texte avant la scène suivante.
 */
export function TextEndBar({ value, duration, disabled, onChange }: { value: number; duration: number; disabled: boolean; onChange: (end: number) => void }) {
  const t = useDictionary();
  const tl = t.app.editor.timeline;
  const full = value >= 1;
  const percent = Math.round(value * 100);
  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "pointer-events-none opacity-50")}>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-100" style={{ width: `${percent}%` }} />
        <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-white shadow" style={{ left: `${percent}%` }} />
        <input
          type="range"
          aria-label={tl.textEndLabel}
          min={TEXT_END_MIN * 100}
          max={100}
          step={1}
          value={percent}
          disabled={disabled}
          onChange={(ev) => onChange(Number(ev.target.value) / 100)}
          className="absolute -inset-y-2 inset-x-0 w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="flex justify-between text-[11px] text-subtle tabular-nums">
        <span>{full ? tl.textEndFull : format(tl.textEndAt, { time: formatSeconds(duration * value, t.locale) })}</span>
        {!full && <button type="button" onClick={() => onChange(1)} className="text-muted hover:text-fg">{tl.textEndReset}</button>}
      </span>
    </div>
  );
}

