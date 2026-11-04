import { z } from "zod";

/**
 * Règles métier de la niche Resto (sans accès base) : prix, horaires, fermetures, plats publiables.
 * Règle produit : aucun plat ni prix n'est inventé. Un prix illisible reste null, jamais deviné.
 */

const MAX_PRICE_CENTS = 100_000_00;

/**
 * Lit un prix tel qu'un restaurateur l'écrit : « 16,90 », « 16.90 € », « 16€90 », « 16 € », « 9,5 ».
 * Renvoie des centimes, ou null si le texte n'est pas un prix sans ambiguïté.
 */
export function parsePrice(input: string): number | null {
  const text = input.trim().replace(/\s+/g, "").replace(/eur(os?)?$/i, "€");
  const match = /^(\d{1,6})(?:(?:[.,]|€)(\d{1,2}))?€?$/.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + (match[2] ? Number(match[2].padEnd(2, "0")) : 0);
  return cents > 0 && cents <= MAX_PRICE_CENTS ? cents : null;
}

/**
 * Prix lu sur une carte, souvent accompagné d'autres mots : « Petite 9 », « 12 € le verre », « Petite 9 / Grande 14 ».
 * Un seul montant : il devient le prix, les mots partent dans `extra` (à ajouter à la description).
 * Plusieurs montants (tailles, formules) : aucun n'est choisi à la place du restaurateur, tout part dans `extra`.
 */
export function splitPriceText(input: string): { priceText: string; priceCents: number | null; extra: string } {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return { priceText: "", priceCents: null, extra: "" };
  const direct = parsePrice(text);
  if (direct !== null) return { priceText: text, priceCents: direct, extra: "" };
  const amounts = [...text.matchAll(/\d{1,6}(?:(?:[.,]|\s?€\s?)\d{1,2})?(?:\s?€)?/g)].map((m) => m[0].trim()).filter((m) => parsePrice(m) !== null);
  if (amounts.length !== 1) return { priceText: "", priceCents: null, extra: text };
  const words = text.replace(amounts[0], " ").replace(/\s+/g, " ").replace(/^[\s:·\-–—/]+|[\s:·\-–—/]+$/g, "").trim();
  return { priceText: amounts[0].replace(/\s?€$/, ""), priceCents: parsePrice(amounts[0]), extra: words };
}

/** Affichage d'un prix : « 16,90 € », « 16 € » quand il est rond. */
export function formatPrice(cents: number, locale: "fr" | "en" = "fr") {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

/** Un service : la fermeture peut passer minuit (bar ouvert de 18:00 à 02:00). */
export const ServiceSchema = z.object({ open: time, close: time }).refine((r) => r.open !== r.close, { error: "empty_service" });

/** Horaires de la semaine, lundi = 0. Un jour absent = fermé. */
export const HoursSchema = z.array(z.object({ day: z.number().int().min(0).max(6), ranges: z.array(ServiceSchema).max(4) }))
  .max(7)
  .refine((days) => new Set(days.map((d) => d.day)).size === days.length, { error: "duplicate_day" })
  .refine((days) => days.every((d) => noOverlap(d.ranges)), { error: "overlapping_services" });

function noOverlap(ranges: { open: string; close: string }[]) {
  const spans = ranges.map((r) => [minutes(r.open), minutes(r.close) > minutes(r.open) ? minutes(r.close) : minutes(r.close) + 1440]).sort((a, b) => a[0] - b[0]);
  return spans.every((span, i) => i === 0 || span[0] >= spans[i - 1][1]);
}

const date = z.iso.date();
/** Fermetures exceptionnelles (congés, travaux), bornes incluses. */
export const ClosuresSchema = z.array(z.object({ from: date, to: date, note: z.string().trim().max(120).optional() }).refine((c) => c.from <= c.to, { error: "closure_order" })).max(50);

export type Hours = z.infer<typeof HoursSchema>;
export type Closures = z.infer<typeof ClosuresSchema>;

/** Le restaurant est-il fermé exceptionnellement ce jour-là (date locale « AAAA-MM-JJ ») ? */
export function closureOn(closures: Closures, day: string) {
  return closures.find((c) => c.from <= day && day <= c.to) ?? null;
}

/** Nom du jour (lundi = 0) dans la langue de la vidéo, avec majuscule : « Lundi », « Monday ». */
export function weekdayName(day: number, locale: "fr" | "en") {
  // 1er janvier 2024 = un lundi ; calcul en UTC pour ne pas dépendre du fuseau
  const name = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + day)));
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Lundi de la semaine à afficher : la semaine en cours, ou la suivante à partir du samedi. Date « AAAA-MM-JJ ». */
export function upcomingMonday(now: Date) {
  const day = (now.getDay() + 6) % 7; // lundi = 0
  const shift = day >= 5 ? 7 - day : -day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + shift);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** Dates de la semaine affichées : « Du 10 au 14 novembre », « 10 – 14 November ». */
export function weekRange(weekStart: string, days: number[], locale: "fr" | "en") {
  const [y, m, d] = weekStart.split("-").map(Number);
  const at = (offset: number) => new Date(Date.UTC(y, m - 1, d + offset));
  const first = at(Math.min(...days)), last = at(Math.max(...days));
  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  const dayOf = (date: Date) => new Intl.DateTimeFormat(tag, { day: "numeric", timeZone: "UTC" }).format(date);
  const full = (date: Date) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  const sameMonth = first.getUTCMonth() === last.getUTCMonth();
  if (locale === "fr") return `Du ${sameMonth ? dayOf(first) : full(first)} au ${full(last)}`;
  return `${sameMonth ? dayOf(first) : full(first)} – ${full(last)}`;
}

/** Description recopiée d'une carte : retire les parenthèses qui l'entourent (une ou deux paires), garde le reste tel quel. */
export function cleanDescription(text: string) {
  // La paire n'est retirée que si la parenthèse ouvrante du début ferme bien à la toute fin
  const wrapped = (value: string) => {
    if (!value.startsWith("(") || !value.endsWith(")")) return false;
    let depth = 0;
    for (let i = 0; i < value.length; i++) {
      depth += value[i] === "(" ? 1 : value[i] === ")" ? -1 : 0;
      if (depth === 0 && i < value.length - 1) return false;
    }
    return true;
  };
  let out = text.trim();
  for (let i = 0; i < 2 && wrapped(out); i++) out = out.slice(1, -1).trim();
  return out;
}

/** Réseaux où le restaurateur publie (choisis à l'accueil) */
export const RESTO_NETWORKS = ["instagram", "facebook", "tiktok", "google"] as const;
export type RestoNetwork = (typeof RESTO_NETWORKS)[number];

export type PublishableDish = { name: string; priceCents: number | null; verified: boolean; active: boolean };

/**
 * Un plat peut apparaître dans un contenu s'il est toujours à la carte et confirmé par le restaurateur.
 * Les plats lus sur une carte importée restent hors des contenus tant qu'ils ne sont pas vérifiés.
 */
export function isPublishable(dish: PublishableDish) {
  return dish.active && dish.verified && dish.name.trim().length > 0;
}
