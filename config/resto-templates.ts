import { RESTO_FORMAT_IDS, type RestoFormatId } from "./formats";

/**
 * Famille de templates Resto : source unique de vérité (styles, formats, musique, coût d'export).
 * Pas encore affichée dans la galerie : elle le sera avec le parcours de création (phase 1).
 * Le rendu est dans remotion/video/resto/.
 */

export const RESTO_STYLE_IDS = ["bistrot", "street", "chic", "carte3d", "table3d"] as const;
export type RestoStyleId = (typeof RESTO_STYLE_IDS)[number];

export type RestoStyle = {
  id: RestoStyleId;
  name: string;
  description: { fr: string; en: string };
  /** Rendu en vraie 3D : export au tarif 3D (CREDIT_COSTS.export.premium3dMultiplier) */
  premium3d: boolean;
  /**
   * Ce que la photo doit permettre :
   * - "any" : n'importe quelle photo du plat ;
   * - "plate" : une assiette ronde visible en entier, dont le contour a été repéré (DishPhoto.plate).
   */
  needs: "any" | "plate";
  /** Piste par défaut (config/music-library.json) */
  musicTrackId: string;
};

export const RESTO_STYLES: readonly RestoStyle[] = [
  { id: "bistrot", name: "Bistrot", premium3d: false, needs: "any", musicTrackId: "just-another-story", description: { fr: "Ardoise et craie : le titre s'écrit, un coup d'éponge révèle le plat.", en: "Chalkboard: the title is written, a sponge wipe reveals the dish." } },
  { id: "street", name: "Street", premium3d: false, needs: "any", musicTrackId: "dongdada", description: { fr: "Typo grasse et couleurs vives : les mots claquent sur le rythme.", en: "Bold type and bright colours: words slam on the beat." } },
  { id: "chic", name: "Chic", premium3d: false, needs: "any", musicTrackId: "countless", description: { fr: "Fond sombre et typo fine : un filet doré s'ouvre sur le plat.", en: "Dark and refined: a gold line opens onto the dish." } },
  { id: "carte3d", name: "Carte", premium3d: true, needs: "any", musicTrackId: "private-jet", description: { fr: "Carte de collection en 3D : elle se retourne et dévoile le plat.", en: "3D collectible card: it flips to reveal the dish." } },
  { id: "table3d", name: "Table", premium3d: true, needs: "plate", musicTrackId: "rise-to-the-rooftop-rhythms", description: { fr: "L'assiette est servie sur une table en 3D, la caméra plonge.", en: "The plate is served on a 3D table as the camera dives." } },
];

/** Instant (s) du premier temps dans la vidéo : la musique est recalée dessus. */
export const RESTO_LEAD = 0.3;
const RESTO_FPS = 30;
/** Longueur du plat du jour en temps musicaux, par style (la vidéo suit le tempo de sa musique). */
export const PLAT_DU_JOUR_BEATS: Record<RestoStyleId, number> = { bistrot: 15, street: 19, chic: 12.5, carte3d: 14, table3d: 15 };

/** Nombre d'images du plat du jour (≈ 8 à 10 s) : même calcul pour le rendu, l'aperçu et le coût d'export. */
export function platDuJourFrames(style: RestoStyleId, bpm: number) {
  return Math.round((RESTO_LEAD + PLAT_DU_JOUR_BEATS[style] * (60 / bpm) + 0.4) * RESTO_FPS);
}

/** Menu de la semaine, en temps musicaux par style : intro (titre et dates), un temps fixe par jour, signature finale. */
export const MENU_SEMAINE_BEATS: Partial<Record<RestoStyleId, { intro: number; perDay: number; outro: number }>> = {
  bistrot: { intro: 4, perDay: 4, outro: 4 },
  street: { intro: 4, perDay: 5, outro: 4 },
  chic: { intro: 3, perDay: 3, outro: 3 },
  carte3d: { intro: 4, perDay: 3.5, outro: 4 },
};
export const MENU_MIN_DAYS = 2;
export const MENU_MAX_DAYS = 7;

/** Repères du menu de la semaine (en temps) : début de chaque jour, début de la signature, fin. */
export function menuSemaineTimeline(style: RestoStyleId, days: number) {
  const beats = MENU_SEMAINE_BEATS[style] ?? MENU_SEMAINE_BEATS.bistrot!;
  return { ...beats, dayStart: (index: number) => beats.intro + index * beats.perDay, outroStart: beats.intro + days * beats.perDay, total: beats.intro + days * beats.perDay + beats.outro };
}

export function menuSemaineFrames(style: RestoStyleId, bpm: number, days: number) {
  return Math.round((RESTO_LEAD + menuSemaineTimeline(style, days).total * (60 / bpm) + 0.4) * RESTO_FPS);
}

/** Formule midi : les plats s'assemblent un par un, puis le prix de la formule tombe. */
export const COURSE_IDS = ["starter", "main", "dessert"] as const;
export type CourseId = (typeof COURSE_IDS)[number];
export const FORMULE_MIDI_BEATS: Partial<Record<RestoStyleId, { intro: number; perCourse: number; finale: number; outro: number }>> = {
  bistrot: { intro: 3, perCourse: 3, finale: 4, outro: 3 },
  street: { intro: 4, perCourse: 4, finale: 5, outro: 3 },
  chic: { intro: 3, perCourse: 2.5, finale: 3.5, outro: 2.5 },
  carte3d: { intro: 4, perCourse: 3, finale: 4, outro: 3 },
};

export function formuleMidiTimeline(style: RestoStyleId, courses: number) {
  const beats = FORMULE_MIDI_BEATS[style] ?? FORMULE_MIDI_BEATS.bistrot!;
  const finaleStart = beats.intro + courses * beats.perCourse;
  return { ...beats, courseStart: (index: number) => beats.intro + index * beats.perCourse, finaleStart, outroStart: finaleStart + beats.finale, total: finaleStart + beats.finale + beats.outro };
}

export function formuleMidiFrames(style: RestoStyleId, bpm: number, courses: number) {
  return Math.round((RESTO_LEAD + formuleMidiTimeline(style, courses).total * (60 / bpm) + 0.4) * RESTO_FPS);
}

export function getRestoStyle(id: string | null | undefined) {
  return RESTO_STYLES.find((style) => style.id === id);
}

/** Une version Resto rendue en vraie 3D (export au tarif 3D). */
export function isRestoPremium3d(graph: { resto?: { style: string } }) {
  return Boolean(graph.resto && getRestoStyle(graph.resto.style)?.premium3d);
}

export const RESTO_TEMPLATE_IDS = ["plat-du-jour", "menu-semaine", "formule-midi", "happy-hour", "evenement", "avis", "horaires", "presentation"] as const;
export type RestoTemplateId = (typeof RESTO_TEMPLATE_IDS)[number];

export type RestoTemplate = {
  id: RestoTemplateId;
  name: { fr: string; en: string };
  styles: readonly RestoStyleId[];
  formats: readonly RestoFormatId[];
};

/** Templates par usage. Ordre de développement : plat du jour → menu de la semaine → formule midi → … */
export const RESTO_TEMPLATES: readonly RestoTemplate[] = [
  { id: "plat-du-jour", name: { fr: "Plat du jour", en: "Dish of the day" }, styles: RESTO_STYLE_IDS, formats: RESTO_FORMAT_IDS },
  // Table 3D demande une assiette repérée par jour : pas proposée pour le menu de la semaine
  { id: "menu-semaine", name: { fr: "Menu de la semaine", en: "This week's menu" }, styles: ["bistrot", "street", "chic", "carte3d"], formats: RESTO_FORMAT_IDS },
  { id: "formule-midi", name: { fr: "Formule midi", en: "Lunch menu" }, styles: ["bistrot", "street", "chic", "carte3d"], formats: RESTO_FORMAT_IDS },
  // Affiches animées (pack du lundi) : 3 styles 2D, la 3D n'apporte rien à des horaires ou à un avis
  { id: "happy-hour", name: { fr: "Happy hour / promo", en: "Happy hour / offer" }, styles: ["bistrot", "street", "chic"], formats: RESTO_FORMAT_IDS },
  { id: "evenement", name: { fr: "Événement", en: "Event" }, styles: ["bistrot", "street", "chic"], formats: RESTO_FORMAT_IDS },
  { id: "avis", name: { fr: "Avis client", en: "Guest reviews" }, styles: ["bistrot", "street", "chic"], formats: RESTO_FORMAT_IDS },
  { id: "horaires", name: { fr: "Horaires / fermeture", en: "Opening hours" }, styles: ["bistrot", "street", "chic"], formats: RESTO_FORMAT_IDS },
  { id: "presentation", name: { fr: "Présentation du resto", en: "About the restaurant" }, styles: ["bistrot", "street", "chic"], formats: RESTO_FORMAT_IDS },
];

export function getRestoTemplate(id: string | null | undefined) {
  return RESTO_TEMPLATES.find((template) => template.id === id);
}

/** Styles proposables pour une photo : Table 3D seulement si l'assiette a été repérée. */
export function stylesForPhoto(template: RestoTemplate, photo: { plate: unknown }) {
  return template.styles.filter((id) => getRestoStyle(id)?.needs !== "plate" || Boolean(photo.plate));
}
