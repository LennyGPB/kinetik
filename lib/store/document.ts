import { z } from "zod";
import { STORE_FONTS, STORE_LAYOUTS, STORE_MAX_PAGES, getStoreTemplate, type StoreLayout } from "../../config/store-templates";

const screen = z.number().int().min(0).max(7).nullable();
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const StorePageSchema = z.object({
  id: z.string().min(1).max(80),
  layout: z.enum(STORE_LAYOUTS),
  title: z.string().max(60),
  subtitle: z.string().max(120),
  /** Bullet lines of the "features" layout. */
  items: z.array(z.string().max(40)).max(4),
  screen,
  /** Second phone of the "duo" layout. */
  screen2: screen,
  /** Android-specific screenshots; null keeps the iPhone ones. */
  android: z.object({ screen, screen2: screen }).nullable(),
});
export const StoreDocumentSchema = z.object({
  type: z.literal("store"),
  templateId: z.string().refine((id) => Boolean(getStoreTemplate(id))),
  colors: z.tuple([hex, hex, hex]),
  font: z.enum(STORE_FONTS),
  uppercase: z.boolean(),
  pages: z.array(StorePageSchema).min(1).max(STORE_MAX_PAGES),
  /** Google Play feature graphic (1024 × 500). */
  banner: z.object({ title: z.string().max(40), subtitle: z.string().max(80) }),
}).refine((doc) => new Set(doc.pages.map((page) => page.id)).size === doc.pages.length, { path: ["pages"] });
export type StoreDocument = z.infer<typeof StoreDocumentSchema>;
export type StorePage = z.infer<typeof StorePageSchema>;

/** Which uploaded screenshot a phone shows on a platform (index into the project's screens). */
export function pageScreens(page: StorePage, platform: "ios" | "android" | "banner") {
  return platform === "android" && page.android ? [page.android.screen, page.android.screen2] : [page.screen, page.screen2];
}

export function newStorePage(id: string, layout: StoreLayout, locale: "fr" | "en", screenCount = 0, used = 0): StorePage {
  const fr = locale === "fr";
  const copy: Record<StoreLayout, Pick<StorePage, "title" | "subtitle" | "items">> = {
    hero: { title: fr ? "Nom de ton app" : "Your app name", subtitle: fr ? "Ce qu’elle change, en une phrase." : "What it changes, in one sentence.", items: [] },
    device: { title: fr ? "Un bénéfice clé" : "One key benefit", subtitle: fr ? "Une phrase qui explique cet écran." : "One sentence explaining this screen.", items: [] },
    duo: { title: fr ? "Deux écrans, une idée" : "Two screens, one idea", subtitle: fr ? "Montre un parcours en deux étapes." : "Show a flow in two steps.", items: [] },
    features: { title: fr ? "Et bien plus encore" : "And much more", subtitle: "", items: fr ? ["Fonctionnalité 1", "Fonctionnalité 2", "Fonctionnalité 3"] : ["Feature 1", "Feature 2", "Feature 3"] },
  };
  const pick = (offset: number) => screenCount ? (used + offset) % screenCount : null;
  return { id, layout, ...copy[layout], screen: layout === "features" ? null : pick(0), screen2: layout === "duo" ? pick(1) : null, android: null };
}

/** Keep each phone on the same screenshot when the media library is reordered or trimmed. */
export function remapStoreScreens(document: StoreDocument, previous: string[], next: string[]): StoreDocument {
  const remap = (index: number | null) => { if (index === null) return null; const found = next.indexOf(previous[index]); return found < 0 ? null : found; };
  return { ...document, pages: document.pages.map((page) => ({ ...page, screen: remap(page.screen), screen2: remap(page.screen2), android: page.android && { screen: remap(page.android.screen), screen2: remap(page.android.screen2) } })) };
}

/** Switching style keeps every text and screenshot; only the look changes. */
export function applyStoreTemplate(document: StoreDocument, templateId: string): StoreDocument {
  const template = getStoreTemplate(templateId)!;
  return { ...document, templateId, colors: [...template.palette], font: template.font, uppercase: template.uppercase };
}

const DEMO_LAYOUTS: StoreLayout[] = ["hero", "device", "duo", "device", "device", "features"];

export function demoStore(templateId: string, locale: "fr" | "en" = "fr", appName = "Flowly"): StoreDocument {
  const template = getStoreTemplate(templateId) ?? getStoreTemplate("store-clean")!;
  const fr = locale === "fr";
  const copy: Pick<StorePage, "title" | "subtitle" | "items">[] = fr ? [
    { title: appName, subtitle: "Ton quotidien, enfin organisé.", items: [] },
    { title: "Toute ta journée d’un coup d’œil", subtitle: "Tâches, rendez-vous et rappels au même endroit.", items: [] },
    { title: "Pensé pour aller vite", subtitle: "Ajoute une tâche en une seconde, où que tu sois.", items: [] },
    { title: "Reste concentré", subtitle: "Des rappels au bon moment, sans bruit.", items: [] },
    { title: "Suis tes progrès", subtitle: "Des statistiques claires, chaque semaine.", items: [] },
    { title: "Et bien plus encore", subtitle: "", items: ["Synchro sur tous tes appareils", "Mode sombre", "Widgets personnalisables", "Sans publicité"] },
  ] : [
    { title: appName, subtitle: "Your day, finally organised.", items: [] },
    { title: "Your whole day at a glance", subtitle: "Tasks, meetings and reminders in one place.", items: [] },
    { title: "Built for speed", subtitle: "Add a task in a second, wherever you are.", items: [] },
    { title: "Stay focused", subtitle: "Reminders at the right moment, without the noise.", items: [] },
    { title: "Track your progress", subtitle: "Clear stats, every week.", items: [] },
    { title: "And much more", subtitle: "", items: ["Sync across all your devices", "Dark mode", "Custom widgets", "No ads"] },
  ];
  let next = 0;
  const pages = DEMO_LAYOUTS.map((layout, i) => {
    const page: StorePage = { id: `demo-${i + 1}`, layout, ...copy[i], screen: layout === "features" ? null : next, screen2: layout === "duo" ? next + 1 : null, android: null };
    next += layout === "duo" ? 2 : layout === "features" ? 0 : 1;
    return page;
  });
  return { type: "store", templateId: template.id, colors: [...template.palette], font: template.font, uppercase: template.uppercase, pages, banner: { title: appName, subtitle: copy[0].subtitle.slice(0, 80) } };
}

/** First draft for a new project: demo layout, screenshots assigned in order (cycling), demo screens when none. */
export function draftStore(templateId: string, locale: "fr" | "en", appName: string, screenCount: number, ids: () => string): StoreDocument {
  const demo = demoStore(templateId, locale, appName);
  const at = (index: number | null) => index === null || !screenCount ? null : index % screenCount;
  return { ...demo, pages: demo.pages.map((page) => ({ ...page, id: ids(), screen: at(page.screen), screen2: at(page.screen2) })) };
}
