"use client";

import Image from "next/image";
import { Camera, X } from "lucide-react";
import { Input } from "@/components/ui/field";
import type { RestoFormatId } from "@/config/formats";
import { MENU_MIN_DAYS, type RestoStyleId } from "@/config/resto-templates";
import type { MenuSemaineContent } from "@/lib/resto/content";
import type { RestoCopy } from "@/lib/resto/copy";
import { formatPrice, parsePrice, upcomingMonday, weekdayName, weekRange } from "@/lib/resto/model";
import type { VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";
import { restoVideoProps } from "./resto-form";
import { CartePicker } from "./carte-picker";
import type { Carte } from "@/lib/resto/carte";

type Locale = "fr" | "en";

export type MenuDayDraft = { day: number; enabled: boolean; name: string; priceText: string; description: string; photoUrl: string | null; focus: { x: number; y: number } };
/** Saisie du menu : les 7 jours sont toujours là, seuls les jours activés entrent dans la vidéo. */
export type MenuDraft = { style: RestoStyleId; format: RestoFormatId; language: Locale; restaurantName: string; showDates: boolean; weekStart: string; days: MenuDayDraft[] };

const center = { x: 0.5, y: 0.5 };
const emptyDay = (day: number): MenuDayDraft => ({ day, enabled: day < 5, name: "", priceText: "", description: "", photoUrl: null, focus: center });

export function newMenuDraft(language: Locale, restaurantName: string, now = new Date()): MenuDraft {
  return { style: "bistrot", format: "PORTRAIT", language, restaurantName, showDates: true, weekStart: upcomingMonday(now), days: Array.from({ length: 7 }, (_, d) => emptyDay(d)) };
}

export function menuDraftFromContent(content: MenuSemaineContent, photoUrls: string[], fallback: Locale): MenuDraft {
  const language = content.language ?? fallback;
  const days = Array.from({ length: 7 }, (_, d) => {
    const saved = content.days.find((item) => item.day === d);
    if (!saved) return { ...emptyDay(d), enabled: false };
    return { day: d, enabled: true, name: saved.name, priceText: saved.priceCents === null ? "" : formatPrice(saved.priceCents, language).replace(/€/g, "").trim(), description: saved.description ?? "", photoUrl: saved.photo === null ? null : photoUrls[saved.photo] ?? null, focus: saved.focus };
  });
  return { style: content.style, format: content.format, language, restaurantName: content.restaurantName, showDates: content.weekStart !== null, weekStart: content.weekStart ?? upcomingMonday(new Date()), days };
}

const dayPriceInvalid = (d: MenuDayDraft) => Boolean(d.priceText.trim()) && parsePrice(d.priceText) === null;
export const activeDays = (draft: MenuDraft) => draft.days.filter((d) => d.enabled);

/**
 * Contenu prêt à enregistrer (photos = index dans `photoUrls`), ou null s'il manque quelque chose.
 * `placeholders` : pour l'aperçu, un jour sans nom prend un nom d'exemple au lieu de bloquer.
 */
export function menuContentFromDraft(draft: MenuDraft, photoUrls: string[], placeholders?: { dish: string; restaurant: string }): (MenuSemaineContent & { language: Locale }) | null {
  const days = activeDays(draft);
  if (days.length < MENU_MIN_DAYS) return null;
  if (!placeholders && (days.some((d) => !d.name.trim() || dayPriceInvalid(d)) || !draft.restaurantName.trim())) return null;
  return {
    template: "menu-semaine", style: draft.style, format: draft.format, language: draft.language,
    restaurantName: draft.restaurantName.trim() || placeholders?.restaurant || "",
    weekStart: draft.showDates ? draft.weekStart : null,
    days: days.map((d) => ({
      day: d.day, name: d.name.trim() || placeholders?.dish || "", focus: d.focus,
      priceCents: d.priceText.trim() && !dayPriceInvalid(d) ? parsePrice(d.priceText) : null,
      ...(d.description.trim() && { description: d.description.trim() }),
      photo: d.photoUrl && photoUrls.includes(d.photoUrl) ? photoUrls.indexOf(d.photoUrl) : null,
    })),
  };
}

/** Aperçu du menu (null tant qu'il y a moins de 2 jours). */
export function menuPreview(draft: MenuDraft, photoUrls: string[], logoUrl: string | null, copy: RestoCopy, overrides: Partial<MenuDraft> = {}, base?: VideoProps["graph"]) {
  const content = menuContentFromDraft({ ...draft, ...overrides }, photoUrls, { dish: copy.menu.dishPlaceholder, restaurant: copy.restaurantPlaceholder });
  return content ? restoVideoProps(content, photoUrls, logoUrl, base) : null;
}

/** Ce qui manque pour enregistrer, à afficher sous les champs. */
export function menuProblem(draft: MenuDraft, copy: RestoCopy) {
  const days = activeDays(draft);
  if (days.length < MENU_MIN_DAYS) return copy.menu.minDays;
  if (days.some((d) => !d.name.trim())) return copy.menu.missing;
  if (days.some(dayPriceInvalid)) return copy.priceInvalid;
  return null;
}

/** Choix des jours puis une ligne par jour : plat, prix, photo facultative. */
export function WeekDaysFields({ draft, onChange, copy, locale, disabled, photo, carte = null }: {
  draft: MenuDraft; onChange: (patch: Partial<MenuDraft>) => void; copy: RestoCopy; locale: Locale; disabled?: boolean;
  /** Ajout d'une photo par jour (création) ; absent : on peut seulement retirer une photo */
  photo?: { uploading: number | null; onPick: (day: number, file: File | undefined) => void };
  /** Carte du restaurateur : remplit un jour en un toucher */
  carte?: Carte | null;
}) {
  const setDay = (day: number, next: Partial<MenuDayDraft>) => onChange({ days: draft.days.map((d) => d.day === day ? { ...d, ...next } : d) });
  const short = (day: number) => weekdayName(day, locale).slice(0, locale === "fr" ? 3 : 3);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{copy.menu.days}</p>
        <div className="grid grid-cols-7 gap-1.5">
          {draft.days.map((d) => (
            <button key={d.day} type="button" aria-pressed={d.enabled} disabled={disabled} onClick={() => setDay(d.day, { enabled: !d.enabled })}
              className={cn("min-h-11 cursor-pointer rounded-xl border-2 text-xs font-semibold transition-[border-color,background-color,color,box-shadow] duration-200", d.enabled ? "border-violet-500 bg-violet-500/10 text-fg shadow-[0_0_0_3px_rgb(139_92_246/0.12)]" : "border-line text-muted hover:border-line-strong")}>
              {short(d.day)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{copy.menu.daysHint}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {draft.days.filter((d) => d.enabled).map((d) => {
          const invalid = dayPriceInvalid(d);
          return (
            <li key={d.day} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2/30 p-3">
              <div className="flex items-center gap-3">
                {/* Photo du jour : vignette, ou bouton d'ajout */}
                <div className="relative size-14 shrink-0">
                  {d.photoUrl ? (
                    <>
                      <div className="relative size-14 overflow-hidden rounded-xl border border-line"><Image src={d.photoUrl} alt="" fill sizes="56px" className="object-cover" unoptimized /></div>
                      <button type="button" aria-label={copy.menu.removePhoto} disabled={disabled} onClick={() => setDay(d.day, { photoUrl: null })} className="absolute -top-1.5 -right-1.5 grid size-6 cursor-pointer place-items-center rounded-full bg-fg text-bg shadow"><X className="size-3.5" /></button>
                    </>
                  ) : photo ? (
                    <label className={cn("grid size-14 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-violet-500 hover:text-violet-500", photo.uploading === d.day && "animate-pulse")}>
                      <input type="file" accept="image/*" className="sr-only" disabled={disabled || photo.uploading !== null} onChange={(e) => photo.onPick(d.day, e.target.files?.[0])} />
                      <span className="flex flex-col items-center gap-0.5 text-[10px] font-medium"><Camera className="size-4" />{copy.menu.addPhoto}</span>
                    </label>
                  ) : <div className="grid size-14 place-items-center rounded-xl border border-line text-muted"><Camera className="size-4 opacity-40" /></div>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-violet-500 uppercase">{weekdayName(d.day, locale)}</span>
                  <div className="flex gap-2">
                    <CartePicker carte={carte} copy={copy} locale={locale} compact disabled={disabled} onPick={(dish) => setDay(d.day, { name: dish.name, priceText: dish.priceCents === null ? "" : formatPrice(dish.priceCents, locale).replace(/€/g, "").trim(), description: dish.description })} />
                    <Input aria-label={`${copy.name} · ${weekdayName(d.day, locale)}`} value={d.name} maxLength={60} placeholder={copy.namePlaceholder} disabled={disabled} onChange={(e) => setDay(d.day, { name: e.target.value })} className="h-10 min-w-0 flex-1" />
                    <div className="relative w-24 shrink-0">
                      <Input aria-label={`${copy.price} · ${weekdayName(d.day, locale)}`} inputMode="decimal" value={d.priceText} maxLength={12} placeholder={copy.pricePlaceholder} disabled={disabled} aria-invalid={invalid} onChange={(e) => setDay(d.day, { priceText: e.target.value })} className={cn("h-10 pr-7", invalid && "border-danger")} />
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted">€</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Dates affichées dans la vidéo (semaine à venir, calculée automatiquement). */
export function DatesField({ draft, onChange, copy, locale, disabled }: { draft: MenuDraft; onChange: (patch: Partial<MenuDraft>) => void; copy: RestoCopy; locale: Locale; disabled?: boolean }) {
  const days = activeDays(draft).map((d) => d.day);
  const label = days.length ? weekRange(draft.weekStart, days, locale) : "";
  return (
    <button type="button" role="switch" aria-checked={draft.showDates} disabled={disabled} onClick={() => onChange({ showDates: !draft.showDates })}
      className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-colors", draft.showDates ? "border-violet-500 bg-violet-500/10" : "border-line hover:border-line-strong")}>
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{copy.menu.showDates}</span>
        <span className="text-xs text-muted">{draft.showDates ? label : copy.menu.noDates}</span>
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", draft.showDates ? "bg-violet-600" : "bg-surface-2")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200", draft.showDates ? "translate-x-5.5" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
