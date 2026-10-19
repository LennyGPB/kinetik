/** Store listing screenshots: one design, rendered at each store's required size. */
export const STORE_SIZES = {
  /** App Store Connect 6.9" iPhone — the only size Apple requires; it scales it down for older devices. */
  ios: { width: 1320, height: 2868, label: "iPhone 6,9\"" },
  /** Google Play phone screenshot, 9:16. */
  android: { width: 1080, height: 1920, label: "Android" },
  /** Google Play feature graphic, required for a listing. */
  banner: { width: 1024, height: 500, label: "Feature graphic" },
} as const;
export type StorePlatform = keyof typeof STORE_SIZES;
export const STORE_MAX_PAGES = 8;

export const STORE_LAYOUTS = ["hero", "device", "duo", "features"] as const;
export type StoreLayout = (typeof STORE_LAYOUTS)[number];
export const STORE_FONTS = ["rounded", "wide", "condensed", "serif"] as const;
export type StoreFont = (typeof STORE_FONTS)[number];
/** How a single phone sits on a page: centred and bleeding off the bottom, tilted, pushed to one side, floating whole, or zoomed in and cropped. */
export type DevicePlacement = "center" | "tilt" | "right" | "float" | "zoom";

export const STORE_TEMPLATES = [
  { id: "store-clean", name: "Clean", background: "clean", palette: ["#F4F4F6", "#111114", "#3B6CF6"], font: "rounded", uppercase: false, align: "center", placements: ["center", "float", "center", "float"], description: { fr: "Fond clair, titres nets, téléphone centré. Le style des grandes apps.", en: "Light background, crisp titles, centred phone. The big-app look." } },
  { id: "store-bold", name: "Bold", background: "bold", palette: ["#FF4D2E", "#FFFFFF", "#2A0E08"], font: "condensed", uppercase: true, align: "center", placements: ["tilt", "center", "tilt", "center"], description: { fr: "Couleur vive en dégradé, gros titres en capitales, téléphones inclinés.", en: "Vivid gradient, big uppercase titles, tilted phones." } },
  { id: "store-midnight", name: "Midnight", background: "midnight", palette: ["#0B0D17", "#F4F6FF", "#7C5CFF"], font: "wide", uppercase: false, align: "center", placements: ["center", "center", "float", "center"], description: { fr: "Fond nuit, halo lumineux derrière l’écran. Pour les apps tech et premium.", en: "Night background with a glow behind the screen. For tech and premium apps." } },
  { id: "store-panorama", name: "Panorama", background: "panorama", palette: ["#FFF6EC", "#1D1B2F", "#FF8A4C"], font: "rounded", uppercase: false, align: "left", placements: ["right", "tilt", "right", "tilt"], description: { fr: "Une vague de couleur continue d’une capture à l’autre dans la fiche du store.", en: "A colour wave that flows from one screenshot to the next on the store page." } },
  { id: "store-editorial", name: "Editorial", background: "editorial", palette: ["#EFE8DC", "#1E1A16", "#B4532A"], font: "serif", uppercase: false, align: "left", placements: ["right", "float", "right", "center"], description: { fr: "Titres serif, filets fins et numérotation. Élégant et posé.", en: "Serif titles, fine rules and numbering. Calm and elegant." } },
  { id: "store-pop", name: "Pop", background: "pop", palette: ["#FFFFFF", "#14141A", "#21C38B"], font: "rounded", uppercase: false, align: "center", placements: ["center", "tilt", "center", "float"], description: { fr: "Bloc de couleur franc, pastilles et téléphone à cheval. Ludique et lisible.", en: "A bold colour block, dots and a phone straddling the edge. Playful and clear." } },
  { id: "store-stage", name: "Stage", background: "stage", palette: ["#0D0D10", "#FFFFFF", "#FFB547"], font: "serif", uppercase: false, align: "center", placements: ["center", "zoom", "float", "zoom"], description: { fr: "Un projecteur sur fond noir, des gros plans sur l’écran. Ton app comme sur scène.", en: "A spotlight on black and close-ups of the screen. Your app, on stage." } },
  { id: "store-blueprint", name: "Blueprint", background: "blueprint", palette: ["#0F2A4A", "#EAF2FF", "#5CC8FF"], font: "wide", uppercase: false, align: "left", placements: ["float", "center", "float", "center"], description: { fr: "Plan technique : grille, cotes et repères qui pointent vers l’écran. Pour les apps d’outils et de dev.", en: "A technical drawing: grid, dimension lines and callouts pointing at the screen. For tools and dev apps." } },
  { id: "store-aurora", name: "Aurora", background: "aurora", palette: ["#F4F0FF", "#1A1530", "#8B5CF6"], font: "rounded", uppercase: false, align: "center", placements: ["center", "float", "tilt", "center"], description: { fr: "Halos de couleur fondus et titres sur un panneau en verre dépoli.", en: "Soft colour halos and titles on a frosted-glass panel." } },
  { id: "store-poster", name: "Poster", background: "poster", palette: ["#111111", "#F5F5F0", "#D7FF3A"], font: "condensed", uppercase: true, align: "center", placements: ["center", "tilt", "float", "center"], description: { fr: "Un mot géant en contour derrière le téléphone, façon affiche de concert.", en: "A giant outlined word behind the phone, gig-poster style." } },
] as const;
export type StoreTemplate = (typeof STORE_TEMPLATES)[number];
export type StoreTemplateId = StoreTemplate["id"];
export function getStoreTemplate(id: string) { return STORE_TEMPLATES.find((template) => template.id === id); }
