// ⚠️ Aussi bundlé par Remotion : imports relatifs uniquement, aucun accès serveur.
import { z } from "zod";
import { formatPrice, HoursSchema, weekdayName, type Hours } from "./model";

/**
 * Affiches animées Resto (pack du lundi) : happy hour / promo, événement, avis, horaires, présentation.
 * Chaque contenu est découpé en « planches » (titre, grosse info, offres, étoiles, avis, horaires…) ;
 * chaque style sait dessiner chaque planche (remotion/video/resto/affiche.tsx). Un nouveau template = une fonction ici.
 * Règle produit : rien n'est inventé. Les avis, notes et prix viennent du restaurateur.
 */

export const AFFICHE_TEMPLATE_IDS = ["happy-hour", "evenement", "avis", "horaires", "presentation"] as const;
export type AfficheTemplateId = (typeof AFFICHE_TEMPLATE_IDS)[number];
export const isAfficheTemplate = (id: string): id is AfficheTemplateId => (AFFICHE_TEMPLATE_IDS as readonly string[]).includes(id);

export const EVENT_KINDS = ["soiree", "quiz", "concert", "match", "brunch", "autre"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

const text = (max: number) => z.string().trim().max(max);
const cents = z.number().int().positive().max(100_000_00).nullable();
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const AfficheDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("happy-hour"),
    kind: z.enum(["happy-hour", "promo"]),
    headline: text(30).min(1),
    /** « Du mardi au samedi » */
    when: text(40),
    /** « 17h – 19h » */
    hours: text(20),
    offers: z.array(z.object({ name: text(40).min(1), oldPriceCents: cents, newPriceCents: cents })).max(3),
    /** « -50 % », « 2 pour 1 » */
    badge: text(14),
  }),
  z.object({
    type: z.literal("evenement"),
    kind: z.enum(EVENT_KINDS),
    title: text(40).min(1),
    date,
    time: time.nullable(),
    description: text(90),
    /** « Réservation au 01 23 45 67 89 » */
    booking: text(50),
  }),
  z.object({
    type: z.literal("avis"),
    reviews: z.array(z.object({ text: text(160).min(1), author: text(30).min(1), stars: z.number().int().min(1).max(5) })).min(1).max(3),
    /** Note moyenne telle qu'affichée par le restaurateur (ex. 4,8), sinon null */
    average: z.number().min(1).max(5).nullable(),
    count: z.number().int().positive().max(1_000_000).nullable(),
    source: text(20),
  }),
  z.object({
    type: z.literal("horaires"),
    mode: z.enum(["hours", "closure"]),
    hours: HoursSchema,
    closure: z.object({ from: date, to: date, reopen: date.nullable() }).refine((c) => c.from <= c.to, { error: "closure_order" }).nullable(),
    note: text(60),
  }).refine((d) => d.mode === "hours" ? d.hours.length > 0 : d.closure !== null, { error: "hours_missing" }),
  z.object({
    type: z.literal("presentation"),
    tagline: text(60).min(1),
    cuisine: text(30),
    address: text(60),
    highlights: z.array(text(40).min(1)).max(3),
  }),
]);
export type AfficheData = z.infer<typeof AfficheDataSchema>;

/* ───────────────────────── Planches ───────────────────────── */

export type Slide =
  | { kind: "title"; kicker: string; title: string; sub?: string; photo: boolean }
  | { kind: "big"; caption: string; value: string; sub?: string }
  | { kind: "offers"; title: string; badge?: string; offers: { name: string; old: string; now: string }[] }
  | { kind: "stars"; value: string; stars: number; caption: string }
  | { kind: "quote"; text: string; author: string; stars: number }
  | { kind: "schedule"; title: string; rows: { day: string; hours: string; closed: boolean }[] }
  | { kind: "lines"; title: string; lines: string[] }
  | { kind: "photo"; caption?: string }
  | { kind: "cta"; title: string; sub?: string };

/** Durée de chaque planche en temps musicaux (un avis ou des horaires se lisent plus longtemps). */
export const SLIDE_BEATS: Record<Slide["kind"], number> = { title: 4, big: 4, offers: 6, stars: 4, quote: 7, schedule: 7, lines: 5, photo: 4, cta: 4 };
const LEAD = 0.3;

const WORDS = {
  fr: {
    "happy-hour": "Happy hour", promo: "Offre spéciale", events: { soiree: "Soirée", quiz: "Soirée quiz", concert: "Concert", match: "Soirée match", brunch: "Brunch", autre: "Événement" },
    on: "Le", at: "à", reviews: "Ils en parlent", rating: "avis", hours: "Nos horaires", closedDay: "Fermé", closure: "Fermeture exceptionnelle",
    closedFrom: (a: string, b: string) => a === b ? `Fermé le ${a}` : `Fermé du ${a} au ${b}`, reopen: (d: string) => `Réouverture le ${d}`,
    welcome: "Bienvenue", highlights: "Chez nous", see: "À très vite", book: "Réservez vite",
  },
  en: {
    "happy-hour": "Happy hour", promo: "Special offer", events: { soiree: "Party night", quiz: "Quiz night", concert: "Live music", match: "Match night", brunch: "Brunch", autre: "Event" },
    on: "On", at: "at", reviews: "What guests say", rating: "reviews", hours: "Opening hours", closedDay: "Closed", closure: "Temporarily closed",
    closedFrom: (a: string, b: string) => a === b ? `Closed on ${a}` : `Closed ${a} – ${b}`, reopen: (d: string) => `Reopening ${d}`,
    welcome: "Welcome", highlights: "Why come", see: "See you soon", book: "Book now",
  },
};
export function afficheWords(locale: "fr" | "en") {
  return WORDS[locale];
}

function longDate(iso: string, locale: "fr" | "en", withDay = true) {
  const [y, m, d] = iso.split("-").map(Number);
  const out = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { ...(withDay && { weekday: "long" }), day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return out.charAt(0).toUpperCase() + out.slice(1);
}
/** « 20h30 » / « 8:30pm » */
export function clockTime(value: string, locale: "fr" | "en") {
  const [h, m] = value.split(":").map(Number);
  if (locale === "fr") return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
const price = (value: number | null, locale: "fr" | "en") => value === null ? "" : formatPrice(value, locale);

function scheduleRows(hours: Hours, locale: "fr" | "en") {
  const w = WORDS[locale];
  return Array.from({ length: 7 }, (_, day) => {
    const ranges = hours.find((h) => h.day === day)?.ranges ?? [];
    return { day: weekdayName(day, locale), closed: ranges.length === 0, hours: ranges.length ? ranges.map((r) => `${clockTime(r.open, locale)}–${clockTime(r.close, locale)}`).join(" · ") : w.closedDay };
  });
}

/** Découpe un contenu en planches, dans la langue de la vidéo. `hasPhoto` : une photo du projet sert de fond au titre. */
export function afficheSlides(data: AfficheData, restaurantName: string, locale: "fr" | "en", hasPhoto: boolean): Slide[] {
  const w = WORDS[locale];
  const outro = (title: string, sub?: string): Slide => ({ kind: "cta", title, ...(sub && { sub }) });
  switch (data.type) {
    case "happy-hour": {
      const same = data.headline.trim().toLowerCase() === w[data.kind].toLowerCase();
      const slides: Slide[] = [{ kind: "title", kicker: same ? restaurantName : w[data.kind], title: data.headline, ...(data.when && { sub: data.when }), photo: hasPhoto }];
      if (data.hours) slides.push({ kind: "big", caption: data.when || w[data.kind], value: data.hours });
      if (data.offers.length) slides.push({ kind: "offers", title: data.headline, ...(data.badge && { badge: data.badge }), offers: data.offers.map((o) => ({ name: o.name, old: price(o.oldPriceCents, locale), now: price(o.newPriceCents, locale) })) });
      else if (data.badge) slides.push({ kind: "big", caption: data.headline, value: data.badge });
      return [...slides, outro(restaurantName, data.hours ? `${data.when ? `${data.when} · ` : ""}${data.hours}` : data.when || undefined)];
    }
    case "evenement": {
      const when = longDate(data.date, locale);
      const slides: Slide[] = [
        { kind: "title", kicker: w.events[data.kind], title: data.title, photo: hasPhoto },
        { kind: "big", caption: w.events[data.kind], value: when, ...(data.time && { sub: `${w.at} ${clockTime(data.time, locale)}` }) },
      ];
      if (data.description) slides.push({ kind: "lines", title: data.title, lines: [data.description] });
      return [...slides, outro(data.booking || w.book, `${restaurantName} · ${when}${data.time ? ` · ${clockTime(data.time, locale)}` : ""}`)];
    }
    case "avis": {
      const slides: Slide[] = [{ kind: "title", kicker: restaurantName, title: w.reviews, photo: hasPhoto }];
      if (data.average !== null) slides.push({ kind: "stars", value: new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }).format(data.average), stars: data.average, caption: [data.count ? `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(data.count)} ${w.rating}` : "", data.source].filter(Boolean).join(" · ") });
      for (const review of data.reviews) slides.push({ kind: "quote", text: review.text, author: review.author, stars: review.stars });
      return [...slides, outro(restaurantName, w.see)];
    }
    case "horaires": {
      if (data.mode === "closure" && data.closure) {
        const from = longDate(data.closure.from, locale, false), to = longDate(data.closure.to, locale, false);
        return [
          { kind: "title", kicker: restaurantName, title: w.closure, ...(data.note && { sub: data.note }), photo: hasPhoto },
          { kind: "big", caption: w.closure, value: w.closedFrom(from, to), ...(data.closure.reopen && { sub: w.reopen(longDate(data.closure.reopen, locale)) }) },
          outro(restaurantName, w.see),
        ];
      }
      return [
        { kind: "title", kicker: restaurantName, title: w.hours, ...(data.note && { sub: data.note }), photo: hasPhoto },
        { kind: "schedule", title: w.hours, rows: scheduleRows(data.hours, locale) },
        outro(restaurantName, w.see),
      ];
    }
    case "presentation": {
      const slides: Slide[] = [{ kind: "title", kicker: w.welcome, title: restaurantName, sub: data.tagline, photo: hasPhoto }];
      if (data.cuisine) slides.push({ kind: "big", caption: restaurantName, value: data.cuisine });
      if (data.highlights.length) slides.push({ kind: "lines", title: w.highlights, lines: data.highlights });
      if (hasPhoto) slides.push({ kind: "photo", caption: data.tagline });
      return [...slides, outro(restaurantName, data.address || w.see)];
    }
  }
}

/** Repères des planches (en temps) et durée totale ; Street joue un peu plus vite. */
export function afficheTimeline(slides: Slide[], style: string) {
  const k = style === "street" ? 1.25 : style === "chic" ? 0.85 : 1;
  const starts: number[] = [];
  let at = 0;
  for (const slide of slides) { starts.push(at); at += SLIDE_BEATS[slide.kind] * k; }
  return { starts, beats: slides.map((s) => SLIDE_BEATS[s.kind] * k), total: at };
}

export function afficheFrames(slides: Slide[], style: string, bpm: number) {
  return Math.round((LEAD + afficheTimeline(slides, style).total * (60 / bpm) + 0.4) * 30);
}
