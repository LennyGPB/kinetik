import type { RestoStyleId } from "@/config/resto-templates";
import type { RestoContent } from "@/lib/resto/content";
import { upcomingMonday } from "@/lib/resto/model";

/** Photo d'exemple du plat du jour (droits de l'éditeur, publiée dans public/resto-examples). */
export const RESTO_EXAMPLE_PHOTO = "/resto-examples/croque.jpg";

/** Photos utilisées par un exemple (seul le plat du jour en a une). */
export const restoExamplePhotos = (template: RestoContent["template"]) => (template === "plat-du-jour" ? [RESTO_EXAMPLE_PHOTO] : []);

/** Contenus d'exemple d'un restaurant fictif : typographie seule, sauf le plat du jour (photo de l'éditeur). */
export function restoExample(template: RestoContent["template"], locale: "fr" | "en", style?: RestoStyleId): RestoContent {
  const content = baseExample(template, locale);
  return style ? { ...content, style } as RestoContent : content;
}

function baseExample(template: RestoContent["template"], locale: "fr" | "en"): RestoContent {
  const fr = locale === "fr";
  const focus = { x: 0.5, y: 0.5 };
  const base = { format: "PORTRAIT" as const, restaurantName: fr ? "Chez Margot" : "Margot's", language: locale, photo: null, focus };
  const monday = upcomingMonday(new Date());
  const friday = (() => { const [y, m, d] = monday.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 4)).toISOString().slice(0, 10); })();
  switch (template) {
    case "plat-du-jour": return { format: "PORTRAIT", restaurantName: base.restaurantName, language: locale, template, style: "street", focus: { x: 0.5, y: 0.55 }, dish: { name: fr ? "Croque-madame & frites" : "Croque-madame & fries", priceCents: 1290, description: fr ? "Jambon blanc, comté, œuf au plat" : "Ham, comté cheese, fried egg" } };
    case "menu-semaine": {
      const days = fr
        ? [["Blanquette de veau", 1590], ["Dos de cabillaud", 1790], ["Bœuf bourguignon", 1690], ["Risotto aux cèpes", 1490], ["Fish & chips", 1550]]
        : [["Beef stew", 1590], ["Roast cod", 1790], ["Chicken pie", 1690], ["Mushroom risotto", 1490], ["Fish & chips", 1550]];
      return { format: "PORTRAIT", restaurantName: base.restaurantName, language: locale, template, style: "street", weekStart: monday, days: days.map(([name, priceCents], day) => ({ name: name as string, priceCents: priceCents as number, day, photo: null, focus })) };
    }
    case "formule-midi": return { ...base, template, style: "chic", priceCents: 1690, availability: fr ? "Du lundi au vendredi" : "Monday to Friday", courses: [
      { course: "starter", name: fr ? "Velouté de potimarron" : "Pumpkin soup", priceCents: null, photo: null, focus },
      { course: "main", name: fr ? "Blanquette de veau" : "Beef stew", priceCents: null, photo: null, focus },
      { course: "dessert", name: fr ? "Tarte Tatin" : "Apple tart", priceCents: null, photo: null, focus },
    ] };
    case "happy-hour": return { ...base, template, style: "street", data: { type: "happy-hour", kind: "happy-hour", headline: "Happy hour", when: fr ? "Du mardi au samedi" : "Tuesday to Saturday", hours: "17h – 19h", badge: "-30 %", offers: [{ name: "Spritz", oldPriceCents: 900, newPriceCents: 600 }, { name: fr ? "Pinte" : "Pint", oldPriceCents: 700, newPriceCents: 500 }] } };
    case "evenement": return { ...base, template, style: "street", data: { type: "evenement", kind: "match", title: fr ? "Soirée match" : "Match night", date: friday, time: "21:00", description: fr ? "Grand écran et planches à partager" : "Big screen and sharing boards", booking: fr ? "Réserve ta table" : "Book your table" } };
    case "avis": return { ...base, template, style: "bistrot", data: { type: "avis", average: 4.8, count: 312, source: "", reviews: [{ text: fr ? "Le meilleur bourguignon du quartier, et un accueil adorable." : "The best stew in the area, and such a warm welcome.", author: "Camille", stars: 5 }] } };
    case "presentation": return { ...base, template, style: "chic", data: { type: "presentation", tagline: fr ? "Cuisine maison, produits du marché" : "Homemade food, market produce", cuisine: fr ? "Bistrot" : "Bistro", address: fr ? "12 rue des Lilas, Lyon" : "12 Lilac Street, London", highlights: [] } };
    default: return { ...base, template: "horaires", style: "bistrot", data: { type: "horaires", mode: "hours", closure: null, note: "", hours: [0, 1, 2, 3, 4, 5].map((day) => ({ day, ranges: [{ open: "12:00", close: "14:30" }, ...(day >= 3 ? [{ open: "19:00", close: "22:30" }] : [])] })) } };
  }
}

