"use client";

import { Flame } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { emptyTemplateSettings, type TemplateKind, type TemplateSettings } from "@/config/template-catalog";
import { useDictionary } from "@/lib/i18n/use-dictionary";
import { cn } from "@/lib/utils";

const TemplateSettingsContext = createContext<TemplateSettings>(emptyTemplateSettings());

/** Réglages admin des templates (masqués / populaires), lus côté serveur dans le layout de l'app. */
export function TemplateSettingsProvider({ value, children }: { value: TemplateSettings; children: ReactNode }) {
  return <TemplateSettingsContext.Provider value={value}>{children}</TemplateSettingsContext.Provider>;
}

/**
 * Templates d'une catégorie tels que la galerie doit les montrer : sans les masqués, populaires en tête.
 * `keep` garde un template masqué visible (ex. celui déjà choisi dans le formulaire).
 */
export function useArrangedTemplates<T extends { id: string }>(kind: TemplateKind, items: readonly T[], keep?: string | null) {
  const settings = useContext(TemplateSettingsContext)[kind];
  return useMemo(() => {
    const hidden = new Set(settings.hidden);
    const popular = new Set(settings.popular);
    const visible = items.filter((item) => !hidden.has(item.id) || item.id === keep);
    const sorted = [...visible.filter((item) => popular.has(item.id)), ...visible.filter((item) => !popular.has(item.id))];
    return { items: sorted, isPopular: (id: string) => popular.has(id) };
  }, [settings, items, keep]);
}

/** Badge « Populaire » posé sur la vignette d'un template. */
export function PopularBadge({ className }: { className?: string }) {
  const { locale } = useDictionary();
  return (
    <span
      className={cn(
        "pointer-events-none relative inline-flex items-center gap-1 overflow-hidden rounded-full bg-gradient-to-r from-[#FF7A18] via-[#FF3D77] to-[#A855F7] px-2.5 py-1 text-[10.5px] font-bold tracking-[0.08em] text-white uppercase shadow-[0_6px_18px_-6px_rgba(255,61,119,0.8)] ring-1 ring-white/30",
        className,
      )}
    >
      <Flame className="size-3 fill-white/90" aria-hidden />
      {locale === "fr" ? "Populaire" : "Popular"}
      {/* Reflet qui balaie le badge */}
      <span className="absolute inset-0 -skew-x-12 animate-sweep bg-gradient-to-r from-transparent via-white/45 to-transparent motion-reduce:hidden" aria-hidden />
    </span>
  );
}
