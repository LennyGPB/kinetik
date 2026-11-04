"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import type { RestoFormatId } from "@/config/formats";
import type { RestoStyleId } from "@/config/resto-templates";
import { AfficheDataSchema, EVENT_KINDS, type AfficheData, type AfficheTemplateId, type EventKind } from "@/lib/resto/affiche";
import type { AfficheContent } from "@/lib/resto/content";
import type { RestoCopy } from "@/lib/resto/copy";
import { formatPrice, parsePrice, upcomingMonday, weekdayName } from "@/lib/resto/model";
import type { VideoProps } from "@/remotion/props";
import { cn } from "@/lib/utils";
import { restoVideoProps } from "./resto-form";

type Locale = "fr" | "en";
type Slot = { on: boolean; open: string; close: string };
type DayHours = { day: number; lunch: Slot; dinner: Slot };

/** Saisie des affiches : textes tels que tapés (prix, notes) ; ils ne deviennent des données qu'une fois lisibles. */
export type AfficheFields =
  | { type: "happy-hour"; kind: "happy-hour" | "promo"; headline: string; when: string; hours: string; badge: string; offers: { name: string; oldText: string; newText: string }[] }
  | { type: "evenement"; kind: EventKind; title: string; date: string; time: string; description: string; booking: string }
  | { type: "avis"; reviews: { text: string; author: string; stars: number }[]; averageText: string; countText: string; source: string }
  | { type: "horaires"; mode: "hours" | "closure"; days: DayHours[]; from: string; to: string; reopen: string; note: string }
  | { type: "presentation"; tagline: string; cuisine: string; address: string; highlights: string[] };

export type AfficheDraft = { template: AfficheTemplateId; style: RestoStyleId; format: RestoFormatId; language: Locale; restaurantName: string; photoUrl: string | null; focus: { x: number; y: number }; fields: AfficheFields };

const slot = (on: boolean, open: string, close: string): Slot => ({ on, open, close });
const isoToday = () => upcomingMonday(new Date());

export function newAfficheFields(template: AfficheTemplateId, copy: RestoCopy): AfficheFields {
  switch (template) {
    case "happy-hour": return { type: "happy-hour", kind: "happy-hour", headline: copy.affiche.happy.defaultHeadline, when: "", hours: "", badge: "", offers: [{ name: "", oldText: "", newText: "" }] };
    case "evenement": return { type: "evenement", kind: "soiree", title: "", date: isoToday(), time: "20:00", description: "", booking: "" };
    case "avis": return { type: "avis", reviews: [{ text: "", author: "", stars: 5 }], averageText: "", countText: "", source: "Google" };
    case "horaires": return { type: "horaires", mode: "hours", from: isoToday(), to: isoToday(), reopen: "", note: "", days: Array.from({ length: 7 }, (_, day) => ({ day, lunch: slot(day < 6, "12:00", "14:30"), dinner: slot(day >= 1 && day < 6, "19:00", "22:30") })) };
    case "presentation": return { type: "presentation", tagline: "", cuisine: "", address: "", highlights: ["", "", ""] };
  }
}

const priceText = (cents: number | null, locale: Locale) => cents === null ? "" : formatPrice(cents, locale).replace(/€/g, "").trim();
const readPrice = (text: string) => text.trim() ? parsePrice(text) : null;
const readNumber = (text: string) => { const n = Number(text.trim().replace(",", ".")); return text.trim() && Number.isFinite(n) ? n : null; };

export function fieldsFromData(data: AfficheData, locale: Locale): AfficheFields {
  switch (data.type) {
    case "happy-hour": return { type: data.type, kind: data.kind, headline: data.headline, when: data.when, hours: data.hours, badge: data.badge, offers: data.offers.map((o) => ({ name: o.name, oldText: priceText(o.oldPriceCents, locale), newText: priceText(o.newPriceCents, locale) })) };
    case "evenement": return { type: data.type, kind: data.kind, title: data.title, date: data.date, time: data.time ?? "", description: data.description, booking: data.booking };
    case "avis": return { type: data.type, reviews: data.reviews, averageText: data.average === null ? "" : String(data.average).replace(".", locale === "fr" ? "," : "."), countText: data.count === null ? "" : String(data.count), source: data.source };
    case "horaires": {
      const days = Array.from({ length: 7 }, (_, day) => {
        const ranges = data.hours.find((h) => h.day === day)?.ranges ?? [];
        return { day, lunch: ranges[0] ? slot(true, ranges[0].open, ranges[0].close) : slot(false, "12:00", "14:30"), dinner: ranges[1] ? slot(true, ranges[1].open, ranges[1].close) : slot(false, "19:00", "22:30") };
      });
      return { type: data.type, mode: data.mode, days, from: data.closure?.from ?? isoToday(), to: data.closure?.to ?? isoToday(), reopen: data.closure?.reopen ?? "", note: data.note };
    }
    case "presentation": return { type: data.type, tagline: data.tagline, cuisine: data.cuisine, address: data.address, highlights: [...data.highlights, "", "", ""].slice(0, 3) };
  }
}

/** Données validées, ou null. `preview` : les champs obligatoires vides prennent un texte d'exemple. */
export function dataFromFields(f: AfficheFields, copy: RestoCopy, preview = false): AfficheData | null {
  const or = (value: string, example: string) => value.trim() || (preview ? example : "");
  const e = copy.affiche.examples;
  let data: unknown;
  switch (f.type) {
    case "happy-hour": {
      const offers = f.offers.filter((o) => o.name.trim() || o.oldText.trim() || o.newText.trim());
      if (offers.some((o) => (o.oldText.trim() && readPrice(o.oldText) === null) || (o.newText.trim() && readPrice(o.newText) === null))) return null;
      data = { type: f.type, kind: f.kind, headline: or(f.headline, copy.affiche.happy.defaultHeadline), when: f.when.trim(), hours: f.hours.trim(), badge: f.badge.trim(), offers: offers.map((o) => ({ name: or(o.name, e.offer), oldPriceCents: readPrice(o.oldText), newPriceCents: readPrice(o.newText) })) };
      break;
    }
    case "evenement":
      data = { type: f.type, kind: f.kind, title: or(f.title, e.event), date: f.date, time: f.time || null, description: f.description.trim(), booking: f.booking.trim() };
      break;
    case "avis": {
      const reviews = f.reviews.filter((r) => r.text.trim() || r.author.trim());
      const average = readNumber(f.averageText), count = readNumber(f.countText);
      if ((f.averageText.trim() && average === null) || (f.countText.trim() && count === null)) return null;
      data = { type: f.type, reviews: (reviews.length ? reviews : preview ? [{ text: e.review, author: e.author, stars: 5 }] : []).map((r) => ({ text: or(r.text, e.review), author: or(r.author, e.author), stars: r.stars })), average, count: count === null ? null : Math.round(count), source: f.source.trim() };
      break;
    }
    case "horaires":
      data = {
        type: f.type, mode: f.mode, note: f.note.trim(),
        hours: f.days.map((d) => ({ day: d.day, ranges: [d.lunch, d.dinner].filter((s) => s.on && s.open && s.close && s.open !== s.close).map((s) => ({ open: s.open, close: s.close })) })).filter((d) => d.ranges.length),
        closure: f.mode === "closure" ? { from: f.from, to: f.to < f.from ? f.from : f.to, reopen: f.reopen || null } : null,
      };
      break;
    case "presentation":
      data = { type: f.type, tagline: or(f.tagline, e.tagline), cuisine: f.cuisine.trim(), address: f.address.trim(), highlights: f.highlights.map((h) => h.trim()).filter(Boolean) };
      break;
  }
  const parsed = AfficheDataSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function afficheContentFromDraft(draft: AfficheDraft, photoUrls: string[], copy: RestoCopy, preview = false): (AfficheContent & { language: Locale }) | null {
  const data = dataFromFields(draft.fields, copy, preview);
  const name = draft.restaurantName.trim() || (preview ? copy.restaurantPlaceholder : "");
  if (!data || !name) return null;
  return { template: draft.template, style: draft.style, format: draft.format, language: draft.language, restaurantName: name, data, focus: draft.focus, photo: draft.photoUrl && photoUrls.includes(draft.photoUrl) ? photoUrls.indexOf(draft.photoUrl) : null };
}

export function affichePreview(draft: AfficheDraft, photoUrls: string[], logoUrl: string | null, copy: RestoCopy, overrides: Partial<AfficheDraft> = {}, base?: VideoProps["graph"]) {
  const content = afficheContentFromDraft({ ...draft, ...overrides }, photoUrls, copy, true);
  return content ? restoVideoProps(content, photoUrls, logoUrl, base) : null;
}

export function afficheDraftFromContent(content: AfficheContent, photoUrls: string[], fallback: Locale): AfficheDraft {
  const language = content.language ?? fallback;
  return { template: content.template, style: content.style, format: content.format, language, restaurantName: content.restaurantName, photoUrl: content.photo === null ? null : photoUrls[content.photo] ?? null, focus: content.focus, fields: fieldsFromData(content.data, language) };
}

/* ───────────────────────── Champs par template ───────────────────────── */

function PriceInput({ value, onChange, label, disabled }: { value: string; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  const invalid = Boolean(value.trim()) && parsePrice(value) === null;
  return (
    <div className="relative w-24 shrink-0">
      <Input aria-label={label} inputMode="decimal" value={value} maxLength={12} placeholder={label} disabled={disabled} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} className={cn("h-10 pr-7", invalid && "border-danger")} />
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted">€</span>
    </div>
  );
}

const card = "flex flex-col gap-3 rounded-2xl border border-line bg-surface-2/30 p-3";
const addButton = "inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-full border border-dashed border-line-strong px-4 text-sm font-medium text-muted transition-colors hover:border-violet-500 hover:text-violet-500";

export function AfficheFieldsForm({ fields, onChange, copy, locale, disabled }: { fields: AfficheFields; onChange: (fields: AfficheFields) => void; copy: RestoCopy; locale: Locale; disabled?: boolean }) {
  const a = copy.affiche;
  const set = <T extends AfficheFields>(next: Partial<T>) => onChange({ ...fields, ...next } as AfficheFields);
  switch (fields.type) {
    case "happy-hour": {
      const f = fields;
      return (
        <div className="flex flex-col gap-5">
          <Segmented label={a.happy.kind} value={f.kind} onChange={(kind) => set({ kind, headline: f.headline === a.happy.defaultHeadline || f.headline === a.happy.promoHeadline ? (kind === "promo" ? a.happy.promoHeadline : a.happy.defaultHeadline) : f.headline })} className="w-full [&>button]:flex-1" options={[{ value: "happy-hour", label: a.happy.happy, disabled }, { value: "promo", label: a.happy.promo, disabled }]} />
          <Field label={a.happy.headline} htmlFor="aff-headline"><Input id="aff-headline" value={f.headline} maxLength={30} disabled={disabled} onChange={(e) => set({ headline: e.target.value })} className="h-12 text-base" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={a.happy.when} htmlFor="aff-when"><Input id="aff-when" value={f.when} maxLength={40} placeholder={a.happy.whenPlaceholder} disabled={disabled} onChange={(e) => set({ when: e.target.value })} /></Field>
            <Field label={a.happy.hours} htmlFor="aff-hours"><Input id="aff-hours" value={f.hours} maxLength={20} placeholder={a.happy.hoursPlaceholder} disabled={disabled} onChange={(e) => set({ hours: e.target.value })} /></Field>
          </div>
          <Field label={a.happy.badge} htmlFor="aff-badge" hint={a.happy.badgeHint}><Input id="aff-badge" value={f.badge} maxLength={14} placeholder="-50 %" disabled={disabled} onChange={(e) => set({ badge: e.target.value })} className="max-w-40" /></Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{a.happy.offers}</p>
            {f.offers.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input aria-label={a.happy.offerName} value={o.name} maxLength={40} placeholder={a.examples.offer} disabled={disabled} onChange={(e) => set({ offers: f.offers.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} className="h-10 min-w-0 flex-1" />
                <PriceInput label={a.happy.before} value={o.oldText} disabled={disabled} onChange={(v) => set({ offers: f.offers.map((x, j) => j === i ? { ...x, oldText: v } : x) })} />
                <PriceInput label={a.happy.after} value={o.newText} disabled={disabled} onChange={(v) => set({ offers: f.offers.map((x, j) => j === i ? { ...x, newText: v } : x) })} />
                <button type="button" aria-label={a.remove} disabled={disabled} onClick={() => set({ offers: f.offers.filter((_, j) => j !== i) })} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"><Trash2 className="size-4" /></button>
              </div>
            ))}
            {f.offers.length < 3 && <button type="button" disabled={disabled} className={addButton} onClick={() => set({ offers: [...f.offers, { name: "", oldText: "", newText: "" }] })}><Plus className="size-4" />{a.happy.addOffer}</button>}
          </div>
        </div>
      );
    }
    case "evenement": {
      const f = fields;
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{a.event.kind}</p>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_KINDS.map((kind) => (
                <button key={kind} type="button" aria-pressed={f.kind === kind} disabled={disabled} onClick={() => set({ kind })}
                  className={cn("min-h-11 cursor-pointer rounded-xl border-2 text-sm font-semibold transition-colors", f.kind === kind ? "border-violet-500 bg-violet-500/10" : "border-line text-muted hover:border-line-strong")}>{a.event.kinds[kind]}</button>
              ))}
            </div>
          </div>
          <Field label={a.event.title} htmlFor="aff-title"><Input id="aff-title" value={f.title} maxLength={40} placeholder={a.examples.event} disabled={disabled} onChange={(e) => set({ title: e.target.value })} className="h-12 text-base" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={a.event.date} htmlFor="aff-date"><Input id="aff-date" type="date" value={f.date} disabled={disabled} onChange={(e) => e.target.value && set({ date: e.target.value })} /></Field>
            <Field label={a.event.time} htmlFor="aff-time"><Input id="aff-time" type="time" value={f.time} disabled={disabled} onChange={(e) => set({ time: e.target.value })} /></Field>
          </div>
          <Field label={a.event.description} htmlFor="aff-desc"><Textarea id="aff-desc" value={f.description} maxLength={90} rows={2} placeholder={a.event.descriptionPlaceholder} disabled={disabled} onChange={(e) => set({ description: e.target.value.replace(/\n/g, " ") })} className="min-h-20" /></Field>
          <Field label={a.event.booking} htmlFor="aff-booking"><Input id="aff-booking" value={f.booking} maxLength={50} placeholder={a.event.bookingPlaceholder} disabled={disabled} onChange={(e) => set({ booking: e.target.value })} /></Field>
        </div>
      );
    }
    case "avis": {
      const f = fields;
      return (
        <div className="flex flex-col gap-5">
          <p className="rounded-xl bg-surface-2/60 px-3.5 py-2.5 text-sm text-muted">{a.reviews.honest}</p>
          {f.reviews.map((r, i) => (
            <div key={i} className={card}>
              <div className="flex items-center justify-between">
                <div className="flex gap-1" role="radiogroup" aria-label={a.reviews.stars}>
                  {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={r.stars === n} aria-label={`${n}/5`} disabled={disabled} onClick={() => set({ reviews: f.reviews.map((x, j) => j === i ? { ...x, stars: n } : x) })} className="cursor-pointer p-0.5"><Star className={cn("size-6 transition-colors", n <= r.stars ? "fill-amber-400 text-amber-400" : "text-line-strong")} /></button>)}
                </div>
                {f.reviews.length > 1 && <button type="button" aria-label={a.remove} disabled={disabled} onClick={() => set({ reviews: f.reviews.filter((_, j) => j !== i) })} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2"><Trash2 className="size-4" /></button>}
              </div>
              <Textarea aria-label={a.reviews.text} value={r.text} maxLength={160} rows={3} placeholder={a.examples.review} disabled={disabled} onChange={(e) => set({ reviews: f.reviews.map((x, j) => j === i ? { ...x, text: e.target.value.replace(/\n/g, " ") } : x) })} className="min-h-24" />
              <Input aria-label={a.reviews.author} value={r.author} maxLength={30} placeholder={a.reviews.authorPlaceholder} disabled={disabled} onChange={(e) => set({ reviews: f.reviews.map((x, j) => j === i ? { ...x, author: e.target.value } : x) })} className="h-10" />
            </div>
          ))}
          {f.reviews.length < 3 && <button type="button" disabled={disabled} className={addButton} onClick={() => set({ reviews: [...f.reviews, { text: "", author: "", stars: 5 }] })}><Plus className="size-4" />{a.reviews.add}</button>}
          <div className="grid grid-cols-3 gap-3">
            <Field label={a.reviews.average} htmlFor="aff-avg"><Input id="aff-avg" inputMode="decimal" value={f.averageText} maxLength={4} placeholder="4,8" disabled={disabled} onChange={(e) => set({ averageText: e.target.value })} /></Field>
            <Field label={a.reviews.count} htmlFor="aff-count"><Input id="aff-count" inputMode="numeric" value={f.countText} maxLength={7} placeholder="230" disabled={disabled} onChange={(e) => set({ countText: e.target.value })} /></Field>
            <Field label={a.reviews.source} htmlFor="aff-source"><Input id="aff-source" value={f.source} maxLength={20} disabled={disabled} onChange={(e) => set({ source: e.target.value })} /></Field>
          </div>
        </div>
      );
    }
    case "horaires": {
      const f = fields;
      const setDay = (day: number, next: Partial<DayHours>) => set({ days: f.days.map((d) => d.day === day ? { ...d, ...next } : d) });
      const slotInputs = (d: DayHours, key: "lunch" | "dinner") => {
        const s = d[key];
        return (
          <div className={cn("flex items-center gap-1.5", !s.on && "opacity-50")}>
            <button type="button" aria-pressed={s.on} disabled={disabled} onClick={() => setDay(d.day, { [key]: { ...s, on: !s.on } })} className={cn("min-h-9 w-16 shrink-0 cursor-pointer rounded-lg border text-xs font-semibold", s.on ? "border-violet-500 bg-violet-500/10" : "border-line text-muted")}>{key === "lunch" ? a.hours.lunch : a.hours.dinner}</button>
            <Input type="time" aria-label={`${weekdayName(d.day, locale)} ${key}`} value={s.open} disabled={disabled || !s.on} onChange={(e) => setDay(d.day, { [key]: { ...s, open: e.target.value } })} className="h-9 min-w-0 flex-1 px-2 text-sm" />
            <Input type="time" aria-label={`${weekdayName(d.day, locale)} ${key}`} value={s.close} disabled={disabled || !s.on} onChange={(e) => setDay(d.day, { [key]: { ...s, close: e.target.value } })} className="h-9 min-w-0 flex-1 px-2 text-sm" />
          </div>
        );
      };
      return (
        <div className="flex flex-col gap-5">
          <Segmented label={a.hours.mode} value={f.mode} onChange={(mode) => set({ mode })} className="w-full [&>button]:flex-1" options={[{ value: "hours", label: a.hours.week, disabled }, { value: "closure", label: a.hours.closure, disabled }]} />
          {f.mode === "hours" ? (
            <ul className="flex flex-col gap-2">
              {f.days.map((d) => (
                <li key={d.day} className={card}>
                  <span className="text-xs font-semibold tracking-wide text-violet-500 uppercase">{weekdayName(d.day, locale)}{!d.lunch.on && !d.dinner.on && <span className="ml-2 text-muted normal-case">· {a.hours.closed}</span>}</span>
                  {slotInputs(d, "lunch")}
                  {slotInputs(d, "dinner")}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={a.hours.from} htmlFor="aff-from"><Input id="aff-from" type="date" value={f.from} disabled={disabled} onChange={(e) => e.target.value && set({ from: e.target.value })} /></Field>
                <Field label={a.hours.to} htmlFor="aff-to"><Input id="aff-to" type="date" value={f.to} min={f.from} disabled={disabled} onChange={(e) => e.target.value && set({ to: e.target.value })} /></Field>
              </div>
              <Field label={a.hours.reopen} htmlFor="aff-reopen"><Input id="aff-reopen" type="date" value={f.reopen} min={f.to} disabled={disabled} onChange={(e) => set({ reopen: e.target.value })} /></Field>
            </div>
          )}
          <Field label={a.hours.note} htmlFor="aff-note"><Input id="aff-note" value={f.note} maxLength={60} placeholder={f.mode === "hours" ? a.hours.notePlaceholder : a.hours.closureNotePlaceholder} disabled={disabled} onChange={(e) => set({ note: e.target.value })} /></Field>
        </div>
      );
    }
    case "presentation": {
      const f = fields;
      return (
        <div className="flex flex-col gap-5">
          <Field label={a.intro.tagline} htmlFor="aff-tagline"><Input id="aff-tagline" value={f.tagline} maxLength={60} placeholder={a.examples.tagline} disabled={disabled} onChange={(e) => set({ tagline: e.target.value })} className="h-12 text-base" /></Field>
          <Field label={a.intro.cuisine} htmlFor="aff-cuisine"><Input id="aff-cuisine" value={f.cuisine} maxLength={30} placeholder={a.intro.cuisinePlaceholder} disabled={disabled} onChange={(e) => set({ cuisine: e.target.value })} /></Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{a.intro.highlights}</p>
            {f.highlights.map((h, i) => <Input key={i} aria-label={`${a.intro.highlights} ${i + 1}`} value={h} maxLength={40} placeholder={a.intro.highlightPlaceholders[i]} disabled={disabled} onChange={(e) => set({ highlights: f.highlights.map((x, j) => j === i ? e.target.value : x) })} className="h-10" />)}
          </div>
          <Field label={a.intro.address} htmlFor="aff-address"><Input id="aff-address" value={f.address} maxLength={60} placeholder={a.intro.addressPlaceholder} disabled={disabled} onChange={(e) => set({ address: e.target.value })} /></Field>
        </div>
      );
    }
  }
}
