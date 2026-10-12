"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Pastille cliquable (color picker natif) + champ hexadécimal. */
export function ColorInput({
  value,
  onChange,
  label,
  onRemove,
  large,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onRemove?: () => void;
  large?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  // Resynchronise le champ texte quand la couleur change via le picker (ajustement pendant le rendu)
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  return (
    <div className={cn("group flex items-center gap-3 rounded-2xl border border-line bg-surface p-2 pr-3 transition-colors focus-within:border-accent", large && "p-3")}>
      <label
        className={cn(
          "relative shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform hover:scale-105",
          large ? "size-14" : "size-10",
        )}
        style={{ background: value }}
      >
        <span className="sr-only">{label}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-subtle">{label}</p>
        <input
          value={draft}
          onChange={(e) => {
            const next = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setDraft(next);
            if (HEX.test(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} (hex)`}
          className="w-full bg-transparent font-mono text-sm uppercase outline-none focus-visible:outline-none"
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={format(t.a11y.remove, { label })}
          className="grid size-7 place-items-center rounded-full text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
