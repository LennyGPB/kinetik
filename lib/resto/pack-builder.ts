import type { CourseId, RestoStyleId, RestoTemplateId } from "@/config/resto-templates";
import { getRestoTemplate } from "@/config/resto-templates";
import type { z } from "zod";
import { RestoContentSchema, type RestoContent } from "./content";
import { closureOn, isPublishable, type Closures, type Hours } from "./model";

/**
 * Composition du pack de la semaine, sans accès base (testable).
 * Règle produit : rien n'est inventé. Les plats viennent de la carte confirmée, les affiches sans source
 * (avis, happy hour, événement) reprennent le dernier contenu du restaurateur ; sinon elles sont signalées, jamais créées de toutes pièces.
 */

export type PackDish = {
  id: string; name: string; description: string | null; priceCents: number | null;
  verified: boolean; active: boolean; featured: boolean; lastFeaturedAt: Date | null;
  category: string | null;
  /** Photo déjà utilisée pour ce plat (plat du jour précédent), à réutiliser */
  photo: { url: string; focus: { x: number; y: number } } | null;
};

export type PackInput = {
  restaurantName: string;
  style: RestoStyleId;
  locale: "fr" | "en";
  hours: Hours;
  closures: Closures;
  contents: RestoTemplateId[];
  dishes: PackDish[];
  /** Dernier contenu du restaurateur par template, avec ses photos (URL) */
  recent: Partial<Record<RestoTemplateId, { content: RestoContent; photos: string[] }>>;
  /** Lundi de la semaine présentée (« AAAA-MM-JJ ») */
  weekStart: string;
};

/** Contenu validé par le même schéma que les créations du restaurateur */
export type PackItemDraft = { template: RestoTemplateId; content: z.output<typeof RestoContentSchema>; photos: string[]; dishIds: string[] };
export type SkipReason = "not_enough_dishes" | "no_courses" | "no_hours" | "create_once" | "invalid";
export type PackPlan = { items: PackItemDraft[]; skipped: { template: RestoTemplateId; reason: SkipReason }[]; closed: boolean };

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const KIND: Record<CourseId | "drink", RegExp> = {
  starter: /entree|starter|entrant|a partager|tapas|mezze/,
  main: /plat|main|principal|burger|pizza|pate|pasta|viande|poisson|bowl|specialit/,
  dessert: /dessert|sucre|douceur|sweet|patisserie/,
  drink: /boisson|drink|vin|wine|biere|beer|cocktail|cafe|coffee|soft|aperitif|bar/,
};
const kindOf = (category: string | null): CourseId | "drink" | null => {
  if (!category) return null;
  const name = normalize(category);
  for (const kind of ["drink", "dessert", "starter", "main"] as const) if (KIND[kind].test(name)) return kind;
  return null;
};

/** Ordre de rotation : les plats jamais montrés d'abord, puis les moins récents ; les plats phares passent devant à égalité. */
function rotation(dishes: PackDish[]) {
  return [...dishes].sort((a, b) => {
    const at = a.lastFeaturedAt?.getTime() ?? 0, bt = b.lastFeaturedAt?.getTime() ?? 0;
    return at - bt || Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
  });
}

const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

/** Jours ouverts de la semaine (lundi = 0) : selon les horaires (du lundi au vendredi s'ils sont vides), hors fermetures. */
export function openDays(hours: Hours, closures: Closures, weekStart: string) {
  const days = hours.length ? hours.filter((h) => h.ranges.length).map((h) => h.day).sort((a, b) => a - b) : [0, 1, 2, 3, 4];
  return days.filter((day) => !closureOn(closures, addDays(weekStart, day)));
}

const dishOf = (dish: PackDish) => ({ name: dish.name.slice(0, 60), priceCents: dish.priceCents, ...(dish.description && { description: dish.description.slice(0, 90) }) });

export function planPack(input: PackInput): PackPlan {
  const plan: PackPlan = { items: [], skipped: [], closed: false };
  const week = openDays(input.hours, input.closures, input.weekStart);
  // Fermé toute la semaine : pas de pack, et on le dit
  if (!week.length) return { ...plan, closed: true };
  const publishable = input.dishes.filter(isPublishable);
  const common = { style: input.style, format: "PORTRAIT" as const, restaurantName: input.restaurantName.slice(0, 40), language: input.locale };
  const used = new Set<string>();

  const push = (template: RestoTemplateId, content: RestoContent, photos: string[], dishIds: string[]) => {
    // Un style non proposé par ce template (ex. Table 3D) retombe sur Bistrot
    const style = getRestoTemplate(template)!.styles.includes(content.style) ? content.style : "bistrot";
    const parsed = RestoContentSchema.safeParse({ ...content, style });
    if (!parsed.success) { plan.skipped.push({ template, reason: "invalid" }); return; }
    plan.items.push({ template, content: parsed.data, photos, dishIds });
    dishIds.forEach((id) => used.add(id));
  };

  for (const template of input.contents) {
    if (template === "menu-semaine") {
      // Un plat principal par jour ouvert (5 au plus), en rotation
      const days = week.slice(0, 5);
      const mains = rotation(publishable.filter((d) => !used.has(d.id) && (kindOf(d.category) === "main" || kindOf(d.category) === null)));
      const picked = mains.slice(0, days.length);
      if (picked.length < 2) { plan.skipped.push({ template, reason: "not_enough_dishes" }); continue; }
      const photos: string[] = [];
      const entries = picked.map((dish, i) => {
        const photo = dish.photo ? photos.push(dish.photo.url) - 1 : null;
        return { ...dishOf(dish), day: days[i], photo, focus: dish.photo?.focus ?? { x: 0.5, y: 0.5 } };
      });
      push(template, { template, ...common, weekStart: input.weekStart, days: entries }, photos, picked.map((d) => d.id));
    } else if (template === "formule-midi") {
      // De préférence un plat pas encore dans le pack ; sinon un plat du menu de la semaine peut revenir dans la formule
      const pick = (kind: CourseId) => {
        const all = rotation(publishable.filter((d) => kindOf(d.category) === kind));
        return all.find((d) => !used.has(d.id)) ?? all[0];
      };
      const chosen = (["starter", "main", "dessert"] as const).map((course) => ({ course, dish: pick(course) })).filter((c) => c.dish);
      if (chosen.length < 2 || !chosen.some((c) => c.course === "main")) { plan.skipped.push({ template, reason: "no_courses" }); continue; }
      const photos: string[] = [];
      const courses = chosen.map(({ course, dish }) => {
        const photo = dish!.photo ? photos.push(dish!.photo.url) - 1 : null;
        return { ...dishOf(dish!), course, photo, focus: dish!.photo?.focus ?? { x: 0.5, y: 0.5 } };
      });
      // Le prix de la formule n'est jamais deviné : il est repris de la dernière formule, sinon absent
      const last = input.recent["formule-midi"]?.content;
      const priceCents = last?.template === "formule-midi" ? last.priceCents : null;
      push(template, { template, ...common, courses, priceCents, ...(last?.template === "formule-midi" && last.availability && { availability: last.availability }) }, photos, chosen.map((c) => c.dish!.id));
    } else if (template === "horaires") {
      if (!input.hours.length) { plan.skipped.push({ template, reason: "no_hours" }); continue; }
      // Fermeture dans les 2 semaines : on l'annonce plutôt que les horaires habituels
      const soon = input.closures.find((c) => c.to >= input.weekStart && c.from <= addDays(input.weekStart, 13));
      const data = soon
        ? { type: "horaires" as const, mode: "closure" as const, hours: input.hours, closure: { from: soon.from, to: soon.to, reopen: addDays(soon.to, 1) }, note: soon.note ?? "" }
        : { type: "horaires" as const, mode: "hours" as const, hours: input.hours, closure: null, note: "" };
      push(template, { template, ...common, data, photo: null, focus: { x: 0.5, y: 0.5 } }, [], []);
    } else if (template !== "plat-du-jour") {
      // Présentation, avis, happy hour, événement : le dernier contenu du restaurateur revient, mis au style du moment
      const last = input.recent[template];
      const stale = last?.content.template === "evenement" && last.content.data.type === "evenement" && last.content.data.date < input.weekStart;
      if (!last || stale) { plan.skipped.push({ template, reason: "create_once" }); continue; }
      push(template, { ...last.content, ...common } as RestoContent, last.photos, []);
    }
  }
  return plan;
}

/** Date locale (Europe/Paris) « AAAA-MM-JJ » et jour de la semaine (lundi = 0). */
export function parisDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday };
}

/** Date du pack de la semaine en cours (le dernier jour de pack passé ou aujourd'hui). */
export function currentPackDate(now: Date, packDay: number) {
  const today = parisDay(now);
  return addDays(today.date, -((today.weekday - packDay + 7) % 7));
}

/** Lundi de la semaine présentée par un pack : la semaine du pack, ou la suivante s'il est préparé le week-end. */
export function packWeekStart(packDate: string) {
  const [y, m, d] = packDate.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return addDays(packDate, weekday >= 5 ? 7 - weekday : -weekday);
}
