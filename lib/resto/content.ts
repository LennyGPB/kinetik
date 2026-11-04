import { z } from "zod";
import { getTrack } from "@/config/music";
import { COURSE_IDS, formuleMidiFrames, getRestoStyle, getRestoTemplate, MENU_MAX_DAYS, MENU_MIN_DAYS, menuSemaineFrames, platDuJourFrames, RESTO_STYLE_IDS, type CourseId, type RestoStyleId } from "@/config/resto-templates";
import { RESTO_FORMAT_IDS, type RestoFormatId } from "@/config/formats";
import type { SceneGraph } from "@/lib/projects/scenes";
import { formatPrice } from "./model";
import { AFFICHE_TEMPLATE_IDS, AfficheDataSchema, afficheFrames, afficheSlides, type AfficheData, type AfficheTemplateId } from "./affiche";

/**
 * Contenus Resto, enregistrés dans chaque version (SceneGraph.resto).
 * Les photos et le logo sont des fichiers du projet (Asset SCREEN / LOGO, dans l'ordre de `position`) :
 * c'est ce qui les rend lisibles par la page de partage et par le rendu, comme pour les autres projets.
 */
type Common = {
  style: RestoStyleId;
  /** Le format vit dans la version (le 4:5 n'existe pas dans le format des projets, voir config/formats.ts). */
  format: RestoFormatId;
  restaurantName: string;
  /** Langue des textes de la vidéo (mots fixes et prix) : celle du site à la création. Absente sur les premières versions. */
  language?: "fr" | "en";
};

export type Dish = { name: string; priceCents: number | null; description?: string };

export type PlatDuJourContent = Common & {
  template: "plat-du-jour";
  dish: Dish;
  /** Point d'intérêt de la photo (0 à 1) : où se trouve le plat, pour le recadrage */
  focus: { x: number; y: number };
  /** Assiette redressée en disque (Table 3D) : index parmi les photos du projet, absent si l'assiette n'a pas été repérée */
  disc?: number | null;
};

export type MenuDay = Dish & {
  /** Jour de la semaine, lundi = 0 */
  day: number;
  /** Photo du projet (index parmi les SCREEN), ou null : le jour s'affiche alors en typographie */
  photo: number | null;
  focus: { x: number; y: number };
};

export type MenuSemaineContent = Common & {
  template: "menu-semaine";
  /** Lundi de la semaine (« AAAA-MM-JJ ») pour afficher les dates ; null = pas de dates */
  weekStart: string | null;
  days: MenuDay[];
};

export type Course = Dish & {
  course: CourseId;
  /** Photo du projet (index parmi les SCREEN), ou null */
  photo: number | null;
  focus: { x: number; y: number };
};

export type FormuleMidiContent = Common & {
  template: "formule-midi";
  /** 2 ou 3 plats, dans l'ordre entrée → plat → dessert */
  courses: Course[];
  /** Prix de la formule ; null = pas de prix affiché */
  priceCents: number | null;
  /** « Du lundi au vendredi, 12h–14h30 » (facultatif) */
  availability?: string;
};

/** Affiche animée (happy hour, événement, avis, horaires, présentation) : `data.type` = `template`. */
export type AfficheContent = Common & {
  template: AfficheTemplateId;
  data: AfficheData;
  /** Photo de fond du titre (index parmi les SCREEN), ou null */
  photo: number | null;
  focus: { x: number; y: number };
};

export type RestoContent = PlatDuJourContent | MenuSemaineContent | FormuleMidiContent | AfficheContent;
export { isAffiche } from "./content-kind";
import { isAffiche } from "./content-kind";

const point = z.number().min(0).max(1);
const focus = z.object({ x: point, y: point });
const dish = {
  name: z.string().trim().min(1).max(60),
  // Le prix est déjà lu (centimes) : jamais deviné ici
  priceCents: z.number().int().positive().max(100_000_00).nullable(),
  description: z.string().trim().max(90).optional(),
};
const common = {
  style: z.enum(RESTO_STYLE_IDS),
  format: z.enum(RESTO_FORMAT_IDS as [RestoFormatId, ...RestoFormatId[]]),
  restaurantName: z.string().trim().min(1).max(40),
  language: z.enum(["fr", "en"]),
};

/** Ce que le restaurateur peut modifier. */
export const RestoContentSchema = z.discriminatedUnion("template", [
  z.object({ template: z.literal("plat-du-jour"), ...common, dish: z.object(dish), focus, disc: z.number().int().min(1).max(1).nullable().optional() }),
  z.object({
    template: z.literal("menu-semaine"), ...common,
    weekStart: z.iso.date().nullable(),
    days: z.array(z.object({ ...dish, day: z.number().int().min(0).max(6), photo: z.number().int().min(0).max(MENU_MAX_DAYS - 1).nullable(), focus }))
      .min(MENU_MIN_DAYS).max(MENU_MAX_DAYS)
      .refine((days) => days.every((d, i) => i === 0 || d.day > days[i - 1].day), { error: "days_order" }),
  }),
  z.object({
    template: z.literal("formule-midi"), ...common,
    courses: z.array(z.object({ ...dish, course: z.enum(COURSE_IDS), photo: z.number().int().min(0).max(COURSE_IDS.length - 1).nullable(), focus }))
      .min(2).max(3)
      .refine((courses) => courses.every((c, i) => i === 0 || COURSE_IDS.indexOf(c.course) > COURSE_IDS.indexOf(courses[i - 1].course)), { error: "courses_order" }),
    priceCents: dish.priceCents,
    availability: z.string().trim().max(50).optional(),
  }),
  ...AFFICHE_TEMPLATE_IDS.map((id) => z.object({ template: z.literal(id), ...common, data: AfficheDataSchema, photo: z.number().int().min(0).max(0).nullable(), focus })),
])
  .refine((content) => !("data" in content) || content.data.type === content.template, { error: "data_template" })
  .refine((content) => getRestoTemplate(content.template)!.styles.includes(content.style), { error: "style_not_offered" })
  // Table 3D seulement avec une assiette repérée et redressée (le disque fait partie des photos du projet)
  .refine((content) => getRestoStyle(content.style)?.needs !== "plate" || (content.template === "plat-du-jour" && typeof content.disc === "number"), { error: "style_needs_plate" });

/** Index des photos du projet utilisées par un contenu (pour vérifier qu'elles existent). */
export function usedPhotos(content: RestoContent) {
  if (content.template === "plat-du-jour") return typeof content.disc === "number" ? [0, content.disc] : [0];
  if (isAffiche(content)) return content.photo === null ? [] : [content.photo];
  const items = content.template === "menu-semaine" ? content.days : content.courses;
  return items.flatMap((d) => d.photo === null ? [] : [d.photo]);
}

/** Prix affiché ; sans prix, rien n'est affiché à sa place. */
export function displayedPrice(dish: Dish, locale: "fr" | "en") {
  return dish.priceCents === null ? "" : formatPrice(dish.priceCents, locale);
}

/**
 * Version complète pour le moteur : une seule scène dont la durée est celle du contenu Resto,
 * pour que la durée, le coût d'export et les rendus existants fonctionnent sans cas particulier.
 */
export function restoGraph(content: RestoContent, photoUrls: string[], fallbackLocale: "fr" | "en"): SceneGraph {
  const locale = content.language ?? fallbackLocale;
  const track = getTrack(getRestoStyle(content.style)!.musicTrackId)!;
  const frames = isAffiche(content) ? afficheFrames(afficheSlides(content.data, content.restaurantName, locale, content.photo !== null), content.style, track.bpm)
    : content.template === "plat-du-jour" ? platDuJourFrames(content.style, track.bpm)
    : content.template === "menu-semaine" ? menuSemaineFrames(content.style, track.bpm, content.days.length)
    : formuleMidiFrames(content.style, track.bpm, content.courses.length);
  const title = isAffiche(content) ? content.restaurantName : content.template === "plat-du-jour" ? content.dish.name : (content.template === "menu-semaine" ? content.days : content.courses).map((d) => d.name).join(" · ").slice(0, 120);
  const subtitle = content.template === "plat-du-jour" ? displayedPrice(content.dish, locale) : content.template === "formule-midi" ? displayedPrice({ name: "", priceCents: content.priceCents }, locale) : "";
  return {
    schema: 1,
    energy: "balanced",
    logoEmphasis: false,
    musicTrackId: track.id,
    bpm: track.bpm,
    beatOffset: track.beatOffset,
    language: locale,
    resto: content,
    scenes: [{ id: "resto-0", kind: "intro", title, subtitle: subtitle || undefined, duration: frames / 30, transition: "cut", screens: photoUrls }],
  };
}
