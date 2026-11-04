"use client";

import Image from "next/image";
import { Camera, X } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import type { RestoFormatId } from "@/config/formats";
import { COURSE_IDS, type CourseId, type RestoStyleId } from "@/config/resto-templates";
import type { FormuleMidiContent } from "@/lib/resto/content";
import type { RestoCopy } from "@/lib/resto/copy";
import { formatPrice, parsePrice } from "@/lib/resto/model";
import type { VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";
import { restoVideoProps } from "./resto-form";
import { CartePicker } from "./carte-picker";
import type { Carte } from "@/lib/resto/carte";

type Locale = "fr" | "en";

export type CourseDraft = { course: CourseId; enabled: boolean; name: string; description: string; photoUrl: string | null; focus: { x: number; y: number } };
/** Saisie de la formule : les 3 plats sont toujours là, seuls ceux cochés entrent dans la vidéo. */
export type FormulaDraft = { style: RestoStyleId; format: RestoFormatId; language: Locale; restaurantName: string; priceText: string; availability: string; courses: CourseDraft[] };

const center = { x: 0.5, y: 0.5 };
const emptyCourse = (course: CourseId): CourseDraft => ({ course, enabled: true, name: "", description: "", photoUrl: null, focus: center });

export function newFormulaDraft(language: Locale, restaurantName: string): FormulaDraft {
  return { style: "bistrot", format: "PORTRAIT", language, restaurantName, priceText: "", availability: "", courses: COURSE_IDS.map(emptyCourse) };
}

export function formulaDraftFromContent(content: FormuleMidiContent, photoUrls: string[], fallback: Locale): FormulaDraft {
  const language = content.language ?? fallback;
  return {
    style: content.style, format: content.format, language, restaurantName: content.restaurantName,
    priceText: content.priceCents === null ? "" : formatPrice(content.priceCents, language).replace(/€/g, "").trim(),
    availability: content.availability ?? "",
    courses: COURSE_IDS.map((course) => {
      const saved = content.courses.find((c) => c.course === course);
      return saved ? { course, enabled: true, name: saved.name, description: saved.description ?? "", photoUrl: saved.photo === null ? null : photoUrls[saved.photo] ?? null, focus: saved.focus } : { ...emptyCourse(course), enabled: false };
    }),
  };
}

const priceInvalid = (draft: FormulaDraft) => Boolean(draft.priceText.trim()) && parsePrice(draft.priceText) === null;
export const activeCourses = (draft: FormulaDraft) => draft.courses.filter((c) => c.enabled);

/** Contenu prêt à enregistrer (photos = index dans `photoUrls`), ou null s'il manque quelque chose. */
export function formulaContentFromDraft(draft: FormulaDraft, photoUrls: string[], placeholders?: { dish: (course: CourseId) => string; restaurant: string }): (FormuleMidiContent & { language: Locale }) | null {
  const courses = activeCourses(draft);
  if (courses.length < 2) return null;
  if (!placeholders && (courses.some((c) => !c.name.trim()) || priceInvalid(draft) || !draft.restaurantName.trim())) return null;
  return {
    template: "formule-midi", style: draft.style, format: draft.format, language: draft.language,
    restaurantName: draft.restaurantName.trim() || placeholders?.restaurant || "",
    priceCents: draft.priceText.trim() && !priceInvalid(draft) ? parsePrice(draft.priceText) : null,
    ...(draft.availability.trim() && { availability: draft.availability.trim() }),
    courses: courses.map((c) => ({
      course: c.course, name: c.name.trim() || placeholders?.dish(c.course) || "", priceCents: null, focus: c.focus,
      ...(c.description.trim() && { description: c.description.trim() }),
      photo: c.photoUrl && photoUrls.includes(c.photoUrl) ? photoUrls.indexOf(c.photoUrl) : null,
    })),
  };
}

export function formulaPreview(draft: FormulaDraft, photoUrls: string[], logoUrl: string | null, copy: RestoCopy, overrides: Partial<FormulaDraft> = {}, base?: VideoProps["graph"]) {
  const content = formulaContentFromDraft({ ...draft, ...overrides }, photoUrls, { dish: (course) => copy.formula.placeholders[course], restaurant: copy.restaurantPlaceholder });
  return content ? restoVideoProps(content, photoUrls, logoUrl, base) : null;
}

export function formulaProblem(draft: FormulaDraft, copy: RestoCopy) {
  const courses = activeCourses(draft);
  if (courses.length < 2) return copy.formula.minCourses;
  if (courses.some((c) => !c.name.trim())) return copy.formula.missing;
  return null;
}

/** Les plats de la formule : on coche entrée / plat / dessert, puis une ligne par plat avec sa photo facultative. */
export function CourseFields({ draft, onChange, copy, disabled, photo, carte = null, locale = "fr" }: {
  draft: FormulaDraft; onChange: (patch: Partial<FormulaDraft>) => void; copy: RestoCopy; disabled?: boolean;
  photo?: { uploading: CourseId | null; onPick: (course: CourseId, file: File | undefined) => void };
  carte?: Carte | null;
  locale?: Locale;
}) {
  const set = (course: CourseId, next: Partial<CourseDraft>) => onChange({ courses: draft.courses.map((c) => c.course === course ? { ...c, ...next } : c) });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{copy.formula.which}</p>
        <div className="grid grid-cols-3 gap-2">
          {draft.courses.map((c) => (
            <button key={c.course} type="button" aria-pressed={c.enabled} disabled={disabled} onClick={() => set(c.course, { enabled: !c.enabled })}
              className={cn("min-h-11 cursor-pointer rounded-xl border-2 text-sm font-semibold transition-[border-color,background-color,color,box-shadow] duration-200", c.enabled ? "border-violet-500 bg-violet-500/10 text-fg shadow-[0_0_0_3px_rgb(139_92_246/0.12)]" : "border-line text-muted hover:border-line-strong")}>
              {copy.formula.courses[c.course]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{copy.formula.whichHint}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {draft.courses.filter((c) => c.enabled).map((c) => (
          <li key={c.course} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/30 p-3">
            <div className="relative size-14 shrink-0">
              {c.photoUrl ? (
                <>
                  <div className="relative size-14 overflow-hidden rounded-xl border border-line"><Image src={c.photoUrl} alt="" fill sizes="56px" className="object-cover" unoptimized /></div>
                  <button type="button" aria-label={copy.menu.removePhoto} disabled={disabled} onClick={() => set(c.course, { photoUrl: null })} className="absolute -top-1.5 -right-1.5 grid size-6 cursor-pointer place-items-center rounded-full bg-fg text-bg shadow"><X className="size-3.5" /></button>
                </>
              ) : photo ? (
                <label className={cn("grid size-14 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line-strong text-muted transition-colors hover:border-violet-500 hover:text-violet-500", photo.uploading === c.course && "animate-pulse")}>
                  <input type="file" accept="image/*" className="sr-only" disabled={disabled || photo.uploading !== null} onChange={(e) => photo.onPick(c.course, e.target.files?.[0])} />
                  <span className="flex flex-col items-center gap-0.5 text-[10px] font-medium"><Camera className="size-4" />{copy.menu.addPhoto}</span>
                </label>
              ) : <div className="grid size-14 place-items-center rounded-xl border border-line text-muted"><Camera className="size-4 opacity-40" /></div>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-violet-500 uppercase">{copy.formula.courses[c.course]}</span>
              <div className="flex gap-2">
              <CartePicker carte={carte} copy={copy} locale={locale} compact disabled={disabled} onPick={(dish) => set(c.course, { name: dish.name, description: dish.description })} />
              <Input aria-label={`${copy.name} · ${copy.formula.courses[c.course]}`} value={c.name} maxLength={60} placeholder={copy.formula.placeholders[c.course]} disabled={disabled} onChange={(e) => set(c.course, { name: e.target.value })} className="h-10 min-w-0 flex-1" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Prix de la formule et horaires (facultatifs). */
export function FormulaPriceFields({ draft, onChange, copy, disabled }: { draft: FormulaDraft; onChange: (patch: Partial<FormulaDraft>) => void; copy: RestoCopy; disabled?: boolean }) {
  const invalid = priceInvalid(draft);
  return (
    <div className="flex flex-col gap-5">
      <Field label={copy.formula.price} htmlFor="formula-price" hint={invalid ? undefined : copy.priceHint} error={invalid ? copy.priceInvalid : undefined}>
        <div className="relative max-w-48">
          <Input id="formula-price" autoFocus inputMode="decimal" value={draft.priceText} maxLength={12} placeholder="19" disabled={disabled} aria-invalid={invalid} onChange={(e) => onChange({ priceText: e.target.value })} className="h-12 pr-9 text-base" />
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted">€</span>
        </div>
      </Field>
      <Field label={copy.formula.availability} htmlFor="formula-availability" hint={copy.formula.availabilityHint}>
        <Input id="formula-availability" value={draft.availability} maxLength={50} placeholder={copy.formula.availabilityPlaceholder} disabled={disabled} onChange={(e) => onChange({ availability: e.target.value })} className="h-12 text-base" />
      </Field>
    </div>
  );
}
