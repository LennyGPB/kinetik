"use client";

import { X } from "lucide-react";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";

/**
 * Pastille de couleur d'un texte (sélecteur natif). Sans couleur choisie, elle montre la couleur actuelle du template
 * (`fallback`, relevée dans l'aperçu) : rien n'est enregistré tant qu'on ne la change pas.
 */
export function TextColorPicker({ value, fallback, disabled, onChange }: { value: string | null; fallback: string | null; disabled: boolean; onChange: (color: string | null) => void }) {
  const tl = useDictionary().app.editor.timeline;
  const shown = value ?? fallback ?? "#ffffff";
  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        title={tl.textColor}
        className={cn("relative size-10 cursor-pointer overflow-hidden rounded-xl border border-line-strong shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)]", disabled && "pointer-events-none opacity-50")}
        style={{ background: shown }}
      >
        <input
          type="color"
          aria-label={tl.textColor}
          disabled={disabled}
          value={shown}
          onChange={(ev) => onChange(ev.target.value.toLowerCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      {value && (
        <button type="button" disabled={disabled} title={tl.textColorReset} aria-label={tl.textColorReset} onClick={() => onChange(null)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
          <X className="size-3.5" />
        </button>
      )}
    </span>
  );
}
