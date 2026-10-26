import { DECORS, decorName } from "./decors";
import { getLogoMotion } from "./logo-motion";
import { getProductTemplate } from "./physical-product";
import { POST_TEMPLATES } from "./post-templates";
import { STORE_TEMPLATES } from "./store-templates";
import { VIDEO_STYLES } from "./styles";

/** Catégories de la galerie (onglets de la page Templates), réglables depuis l'admin. */
export const TEMPLATE_KINDS = ["motion", "product", "logo", "post", "store", "decor"] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

/** Nombre max de templates « Populaire » par catégorie. */
export const MAX_POPULAR = 8;

export function isTemplateKind(value: unknown): value is TemplateKind {
  return TEMPLATE_KINDS.includes(value as TemplateKind);
}

/** Catégorie d'un template vidéo (motion, produit physique ou logo). */
export function videoStyleKind(id: string): TemplateKind {
  return getProductTemplate(id) ? "product" : getLogoMotion(id) ? "logo" : "motion";
}

/** Tous les templates proposés dans une catégorie, dans l'ordre du catalogue. */
export function templatesOfKind(kind: TemplateKind, locale: string): { id: string; name: string; palette: readonly string[] }[] {
  switch (kind) {
    case "post": return POST_TEMPLATES.map(({ id, name, palette }) => ({ id, name, palette }));
    case "store": return STORE_TEMPLATES.map(({ id, name, palette }) => ({ id, name, palette }));
    case "decor": return DECORS.map(({ id }) => ({ id, name: decorName(id, locale), palette: [] }));
    default: return VIDEO_STYLES.filter((style) => videoStyleKind(style.id) === kind).map(({ id, name, palette }) => ({ id, name, palette }));
  }
}

/** Réglages admin : ids masqués et populaires, par catégorie. */
export type TemplateSettings = Record<TemplateKind, { hidden: string[]; popular: string[] }>;

export function emptyTemplateSettings(): TemplateSettings {
  return Object.fromEntries(TEMPLATE_KINDS.map((kind) => [kind, { hidden: [], popular: [] }])) as unknown as TemplateSettings;
}
