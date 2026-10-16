// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { AspectRatio } from "./formats";
import { getRecipe, type BackgroundKind, type Recipe } from "./recipes";

export type { BackgroundKind, Recipe, ScreensLayout, Typography } from "./recipes";

/** Fond animé du template (alias historique). */
export type SceneKind = BackgroundKind;

export type StyleCategory = "editorial" | "tech" | "minimal" | "typo" | "bold" | "fun" | "business";

/** Fiche catalogue d'un template. Son rendu est décrit par sa recette (config/recipes.ts). */
export type VideoStyle = {
  id: string;
  name: string;
  category: StyleCategory;
  /** 3 couleurs : fond, principale, accent */
  palette: [string, string, string];
  /** Ratio d'aperçu dans la galerie */
  ratio: AspectRatio;
  /** Vidéo de démo (à renseigner quand Kinetik les aura générées) */
  previewSrc?: string;
  recipe: Recipe;
};

export const STYLE_CATEGORIES: StyleCategory[] = ["editorial", "tech", "minimal", "typo", "bold", "fun", "business"];

const CATALOG: Omit<VideoStyle, "recipe">[] = [
  { id: "cadran", name: "Cadran", category: "editorial", palette: ["#242724", "#FBF0DF", "#CDBFA3"], ratio: "9:16" },
  { id: "passage", name: "Passage", category: "editorial", palette: ["#171B1E", "#FFF0DD", "#DA6944"], ratio: "9:16" },
  { id: "reverie", name: "Rêverie", category: "editorial", palette: ["#23302D", "#F9EEDD", "#E6AF91"], ratio: "9:16" },
  { id: "duplex", name: "Duplex", category: "editorial", palette: ["#292623", "#FAEEDA", "#BFA580"], ratio: "4:5" },
  { id: "terracotta", name: "Terracotta", category: "editorial", palette: ["#873C2B", "#FFF1DD", "#DE9972"], ratio: "9:16" },
  { id: "silhouette", name: "Silhouette", category: "editorial", palette: ["#242320", "#F8EDDE", "#C1A27B"], ratio: "9:16" },
  { id: "bulletin", name: "Bulletin", category: "editorial", palette: ["#202020", "#FFF3E6", "#C63D20"], ratio: "9:16" },
  { id: "montage", name: "Montage", category: "editorial", palette: ["#191D20", "#FFF3E6", "#D87550"], ratio: "9:16" },
  { id: "fervor", name: "Fervor", category: "editorial", palette: ["#6A2418", "#FFF3E2", "#F16D2E"], ratio: "9:16" },
  { id: "horizon", name: "Horizon", category: "editorial", palette: ["#17353E", "#FFF0D7", "#D4B986"], ratio: "4:5" },
  { id: "dispatch", name: "Dispatch", category: "editorial", palette: ["#181818", "#FFF5E9", "#D83A18"], ratio: "9:16" },
  { id: "maison", name: "Maison", category: "editorial", palette: ["#242B28", "#FFF3E6", "#DEC6A5"], ratio: "9:16" },
  { id: "oblique", name: "Oblique", category: "editorial", palette: ["#181A1A", "#F6F0E5", "#EB633A"], ratio: "9:16" },
  { id: "solstice", name: "Solstice", category: "editorial", palette: ["#433425", "#FFF2DB", "#EAC496"], ratio: "9:16" },
  { id: "archive", name: "Archive", category: "editorial", palette: ["#252725", "#F6F0E5", "#CAB898"], ratio: "4:5" },
  { id: "monolith", name: "Monolith", category: "minimal", palette: ["#f4f3ef", "#171717", "#171717"], ratio: "9:16" },
  { id: "focus", name: "Focus", category: "minimal", palette: ["#111316", "#e9e7df", "#e9e7df"], ratio: "16:9" },
  { id: "prism", name: "Prism", category: "tech", palette: ["#110e23", "#b49bfa", "#64dbc3"], ratio: "9:16" },
  { id: "papercut", name: "Papercut", category: "fun", palette: ["#f5eada", "#d66a48", "#285c50"], ratio: "4:5" },
  { id: "metro", name: "Metro", category: "bold", palette: ["#0a2027", "#ffbf59", "#79d7ba"], ratio: "1:1" },
  { id: "apple", name: "Apple-like", category: "minimal", palette: ["#fbfbfd", "#1d1d1f", "#0071e3"], ratio: "16:9" },
  { id: "kinetic-typo", name: "Kinetic Typo", category: "typo", palette: ["#f5f0e6", "#111111", "#ff4d2e"], ratio: "9:16" },
  { id: "glitch", name: "Glitch", category: "bold", palette: ["#050505", "#00ffd1", "#ff2bd6"], ratio: "1:1" },
  { id: "minimal", name: "Minimal", category: "minimal", palette: ["#fafafa", "#18181b", "#a1a1aa"], ratio: "1:1" },
  { id: "neon", name: "Neon", category: "bold", palette: ["#0b0320", "#c026ff", "#22d3ee"], ratio: "9:16" },
  { id: "corporate", name: "Corporate", category: "business", palette: ["#0b1b3a", "#3b82f6", "#e2e8f0"], ratio: "16:9" },
  { id: "playful", name: "Playful", category: "fun", palette: ["#fff3c4", "#ff6b9a", "#5b5bf7"], ratio: "9:16" },
  { id: "3d-flat", name: "3D Flat", category: "fun", palette: ["#dff3ff", "#2563eb", "#f97316"], ratio: "1:1" },
  { id: "gradient-flow", name: "Gradient Flow", category: "tech", palette: ["#140a2e", "#7c3aed", "#f472b6"], ratio: "16:9" },
  { id: "beat-cut", name: "Beat Cut", category: "bold", palette: ["#0a0a0a", "#facc15", "#f43f5e"], ratio: "1:1" },
  { id: "brutalist", name: "Brutalist", category: "typo", palette: ["#e7e5e4", "#0c0a09", "#22c55e"], ratio: "16:9" },
  { id: "liquid-glass", name: "Liquid Glass", category: "tech", palette: ["#061826", "#38bdf8", "#a78bfa"], ratio: "9:16" },
  { id: "editorial", name: "Editorial", category: "typo", palette: ["#f3eee4", "#1c1917", "#c2410c"], ratio: "4:5" },
  { id: "terminal", name: "Terminal", category: "tech", palette: ["#07100b", "#22c55e", "#a3e635"], ratio: "16:9" },
  { id: "luxe", name: "Luxe", category: "minimal", palette: ["#100e0b", "#c4a46a", "#e8d6ad"], ratio: "9:16" },
  { id: "y2k", name: "Y2K", category: "fun", palette: ["#ece8ff", "#7c3aed", "#06b6d4"], ratio: "1:1" },
  { id: "dashboard", name: "Dashboard", category: "business", palette: ["#0a0e1a", "#6366f1", "#10b981"], ratio: "16:9" },
  { id: "swiss", name: "Swiss", category: "typo", palette: ["#f2f2ef", "#111111", "#e30613"], ratio: "4:5" },
  { id: "pitch", name: "Pitch", category: "business", palette: ["#ffffff", "#4f46e5", "#10b981"], ratio: "16:9" },
  { id: "orbit", name: "Orbit", category: "tech", palette: ["#05061a", "#6366f1", "#22d3ee"], ratio: "16:9" },
  { id: "pulse", name: "Pulse", category: "bold", palette: ["#0a0a0a", "#a3e635", "#f5f5f5"], ratio: "9:16" },
  { id: "zine", name: "Zine", category: "fun", palette: ["#f4ecd8", "#1d4ed8", "#ff5fa2"], ratio: "1:1" },
  { id: "synthwave", name: "Synthwave", category: "bold", palette: ["#12002b", "#ff2bd6", "#ff9e2c"], ratio: "9:16" },
  { id: "pop", name: "Pop Art", category: "fun", palette: ["#ffe14d", "#e10600", "#1d3fff"], ratio: "1:1" },
  { id: "sprint", name: "Sprint", category: "bold", palette: ["#0d0d0d", "#ff4d00", "#f5f5f5"], ratio: "9:16" },
  { id: "golden-hour", name: "Golden Hour", category: "minimal", palette: ["#2a1033", "#ff7a59", "#ffc94d"], ratio: "16:9" },
  { id: "fiesta", name: "Fiesta", category: "fun", palette: ["#1b1033", "#ffd23f", "#ff5ea8"], ratio: "9:16" },
  { id: "blueprint", name: "Blueprint", category: "tech", palette: ["#0a2a6b", "#ffffff", "#7dd3fc"], ratio: "16:9" },
  { id: "studio", name: "Studio", category: "business", palette: ["#f1f0ed", "#243d35", "#9a643d"], ratio: "4:5" },
  { id: "cinema", name: "Cinéma", category: "minimal", palette: ["#0b1418", "#ff8a3d", "#2ec4b6"], ratio: "16:9" },
  { id: "ocean", name: "Ocean", category: "minimal", palette: ["#04263a", "#3fb6d9", "#a6f0ff"], ratio: "9:16" },
  { id: "arcade", name: "Arcade", category: "fun", palette: ["#0b0b1e", "#39ff14", "#ff2e88"], ratio: "1:1" },
  { id: "seventies", name: "Seventies", category: "fun", palette: ["#f6e7c8", "#d9480f", "#7a3e1d"], ratio: "4:5" },
  { id: "terrain", name: "Terrain", category: "tech", palette: ["#0f1f17", "#b8f35a", "#e8dcc2"], ratio: "16:9" },
  { id: "hyperspace", name: "Hyperspace", category: "tech", palette: ["#03030b", "#7c5cff", "#00e5ff"], ratio: "9:16" },
  { id: "creator", name: "Creator", category: "bold", palette: ["#14141f", "#ff5e3a", "#ffd23f"], ratio: "9:16" },
  { id: "riso", name: "Riso", category: "typo", palette: ["#f7f3ea", "#ff48b0", "#0078bf"], ratio: "4:5" },
  { id: "summit", name: "Summit", category: "business", palette: ["#0c0e13", "#f2f4f8", "#4f8cff"], ratio: "16:9" },
  { id: "aurora", name: "Aurore", category: "tech", palette: ["#06131b", "#5cd4b4", "#8e88e8"], ratio: "9:16" },
];

export const VIDEO_STYLES: VideoStyle[] = CATALOG.map((style) => ({ ...style, recipe: getRecipe(style.id) }));

export function getStyle(id: string | null | undefined) {
  return VIDEO_STYLES.find((s) => s.id === id);
}
