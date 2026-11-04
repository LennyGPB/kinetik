// ⚠️ Bundlé par Remotion : imports relatifs uniquement.
import type { CSSProperties } from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { formuleMidiTimeline, menuSemaineTimeline, RESTO_LEAD as LEAD, type RestoStyleId } from "../../../config/resto-templates";
import type { RestoFormatId } from "../../../config/formats";

/** Briques partagées des templates Resto : horloge musicale, ajustement des textes, médias. */

export const FPS = 30;
/** Instant (s) du premier temps dans la vidéo : la musique est recalée dessus. */
export { LEAD };

export const beatSeconds = (bpm: number) => 60 / bpm;
export const src = (url: string) => (/^(https?:|data:|\/)/.test(url) ? url : staticFile(url));
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Horloge en temps musicaux. */
export function useBeats(bpm: number) {
  const frame = useCurrentFrame();
  const beat = beatSeconds(bpm);
  const b = (frame / FPS - LEAD) / beat;
  /** Progression 0 → 1 entre deux temps, avec courbe. */
  const span = (from: number, to: number, easing: (t: number) => number = Easing.out(Easing.cubic)) => interpolate(b, [from, to], [0, 1], { ...clamp, easing });
  /** Pulsation continue calée sur le temps (jamais de dent de scie). */
  const pulse = (0.5 + 0.5 * Math.cos(2 * Math.PI * b)) ** 2;
  return { frame, b, span, pulse, t: frame / FPS };
}

/** Mots fixes des templates Resto, par langue de la vidéo. */
export type RestoLocale = "fr" | "en";
const WORDS = {
  fr: { today: "Aujourd'hui", todayCaps: "AUJOURD'HUI", title: ["Plat", "du jour"], stack: ["Plat", "du", "Jour"], line: "Le plat du jour", label: "PLAT DU JOUR", edition: "ÉDITION DU JOUR", number: "N° 01", price: "LE PLAT", menu: ["Menu", "de la semaine"], menuStack: ["Menu", "de la", "semaine"], menuLine: "Menu de la semaine", menuLabel: "MENU DE LA SEMAINE", week: "Cette semaine", weekCaps: "CETTE SEMAINE", enjoy: "Bon appétit !", menuEdition: "LA SEMAINE", formula: ["Formule", "midi"], formulaCaps: "FORMULE MIDI", courses: { starter: "Entrée", main: "Plat", dessert: "Dessert" }, formulaPrice: "LA FORMULE" },
  en: { today: "Today", todayCaps: "TODAY", title: ["Dish of", "the day"], stack: ["Dish", "of the", "Day"], line: "Dish of the day", label: "DISH OF THE DAY", edition: "DAILY EDITION", number: "No. 01", price: "TODAY", menu: ["This week's", "menu"], menuStack: ["This", "week's", "menu"], menuLine: "This week's menu", menuLabel: "THIS WEEK'S MENU", week: "This week", weekCaps: "THIS WEEK", enjoy: "Enjoy!", menuEdition: "THIS WEEK", formula: ["Lunch", "menu"], formulaCaps: "LUNCH MENU", courses: { starter: "Starter", main: "Main", dessert: "Dessert" }, formulaPrice: "ALL FOR" },
};
export function restoWords(locale: string | null | undefined) {
  return WORDS[locale === "en" ? "en" : "fr"];
}

/** Taille de police qui fait tenir la ligne la plus longue dans `maxWidth` (en px). */
export function fitSize(lines: string[], base: number, maxWidth: number, charWidth: number) {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return Math.min(base, maxWidth / (longest * charWidth));
}

/** Coupe un texte en `maxLines` lignes de longueurs proches. */
export function splitBalanced(text: string, maxLines: number) {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1 || maxLines <= 1) return [text.trim()];
  let best: string[] = [text.trim()];
  let bestScore = text.length;
  const tryLines = (n: number) => {
    const target = text.length / n;
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      if (current && (current + " " + w).length > target * 1.15 && lines.length < n - 1) { lines.push(current); current = w; }
      else current = current ? current + " " + w : w;
    }
    lines.push(current);
    const score = Math.max(...lines.map((l) => l.length));
    if (score < bestScore - 2) { best = lines; bestScore = score; }
  };
  for (let n = 2; n <= Math.min(maxLines, words.length); n++) tryLines(n);
  return best;
}

/** Logo importé, ou à défaut le nom du restaurant composé dans la typo du style. */
export function Logo({ url, name, style, fontStyle }: { url?: string | null; name: string; style?: CSSProperties; fontStyle: CSSProperties }) {
  if (url) return <Img src={src(url)} style={{ objectFit: "contain", ...style }} />;
  return <div style={{ whiteSpace: "nowrap", ...style, ...fontStyle }}>{name}</div>;
}

/** Un jour du menu de la semaine, prêt à afficher. */
export type MenuDayView = { label: string; name: string; price: string; description: string | null; photoUrl: string | null; focus: { x: number; y: number } };

export type MenuSemaineProps = {
  style: RestoStyleId;
  format: RestoFormatId;
  locale: RestoLocale;
  days: MenuDayView[];
  /** « Du 10 au 14 novembre », ou null */
  dates: string | null;
  restaurantName: string;
  logoUrl?: string | null;
  musicSrc?: string | null;
  bpm: number;
  beatOffset: number;
};

/** Horloge du menu : temps musical, jour en cours (-1 = intro, days.length = signature finale). */
export function useMenuClock(p: Pick<MenuSemaineProps, "style" | "bpm" | "days">) {
  const clock = useBeats(p.bpm);
  const tl = menuSemaineTimeline(p.style, p.days.length);
  const raw = Math.floor((clock.b - tl.intro) / tl.perDay);
  const index = clock.b < tl.intro ? -1 : clock.b >= tl.outroStart ? p.days.length : Math.min(p.days.length - 1, raw);
  return { ...clock, tl, index };
}

/** Un plat de la formule midi, prêt à afficher. */
export type FormulaCourseView = { label: string; name: string; description: string | null; photoUrl: string | null; focus: { x: number; y: number } };

export type FormuleMidiProps = {
  style: RestoStyleId;
  format: RestoFormatId;
  locale: RestoLocale;
  courses: FormulaCourseView[];
  /** Prix de la formule, déjà formaté ; vide = pas de prix */
  price: string;
  availability: string | null;
  restaurantName: string;
  logoUrl?: string | null;
  musicSrc?: string | null;
  bpm: number;
  beatOffset: number;
};

/** Horloge de la formule : temps musical et repères (intro, chaque plat, prix, signature). */
export function useFormulaClock(p: Pick<FormuleMidiProps, "style" | "bpm" | "courses">) {
  const clock = useBeats(p.bpm);
  return { ...clock, tl: formuleMidiTimeline(p.style, p.courses.length) };
}
