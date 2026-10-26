/**
 * Génère config/layer-icons.ts : un jeu choisi d'icônes Lucide (tracés seuls) pour les calques animés du chat.
 * Usage : node scripts/generate-layer-icons.mjs
 */
import { writeFile } from "node:fs/promises";

const NAMES = [
  "check", "check-check", "circle-check", "x", "plus", "minus", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-up-right",
  "chevron-right", "move-right", "trending-up", "trending-down", "chart-line", "chart-column", "chart-pie", "activity", "gauge",
  "star", "heart", "thumbs-up", "sparkles", "zap", "flame", "rocket", "trophy", "crown", "gem", "gift", "party-popper",
  "bell", "mail", "message-circle", "send", "phone", "search", "settings", "user", "users", "lock", "shield-check", "key",
  "clock", "calendar", "timer", "hourglass", "globe", "map-pin", "house", "shopping-cart", "shopping-bag", "credit-card",
  "wallet", "dollar-sign", "euro", "percent", "tag", "package", "truck", "box", "layers", "layout-grid", "smartphone",
  "laptop", "monitor", "cloud", "download", "upload", "link", "share-2", "play", "pause", "music", "camera", "image",
  "video", "mic", "lightbulb", "target", "flag", "leaf", "sun", "moon", "droplet", "wand-sparkles", "brain", "cpu", "code",
];

const icons = {};
for (const name of NAMES) {
  const url = new URL(`../node_modules/lucide-react/dist/esm/icons/${name}.mjs`, import.meta.url);
  const node = await import(url.href).then((mod) => mod.__iconData?.node).catch(() => null);
  if (!node) { console.warn("icône absente :", name); continue; }
  icons[name] = node.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== "key"))]);
}

const body = `/**
 * Icônes des calques animés (type "icon"), tracés Lucide (ISC, https://lucide.dev) dans une grille 24 × 24.
 * Fichier généré par scripts/generate-layer-icons.mjs : ne pas modifier à la main. Imports relatifs uniquement (bundle Remotion).
 */
export type IconElement = [tag: "path" | "circle" | "rect" | "line" | "polyline" | "polygon" | "ellipse", attributes: Record<string, string | number>];

export const LAYER_ICONS = ${JSON.stringify(icons)} as unknown as Record<string, IconElement[]>;

export const LAYER_ICON_NAMES = Object.keys(LAYER_ICONS);
`;
await writeFile(new URL("../config/layer-icons.ts", import.meta.url), body);
console.log(Object.keys(icons).length, "icônes");
