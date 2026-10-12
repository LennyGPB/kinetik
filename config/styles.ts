// ⚠️ Fichier aussi bundlé par Remotion : imports RELATIFS uniquement.
import type { AspectRatio } from "./formats";
import { getRecipe, type BackgroundKind, type Recipe } from "./recipes";

export type { BackgroundKind, Recipe, ScreensLayout, Typography } from "./recipes";

/** Fond animé du template (alias historique). */
export type SceneKind = BackgroundKind;

export type StyleCategory = "tech" | "minimal" | "typo" | "bold" | "fun" | "business";

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

export const STYLE_CATEGORIES: StyleCategory[] = ["tech", "minimal", "typo", "bold", "fun", "business"];

const CATALOG: Omit<VideoStyle, "recipe">[] = [
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
  { id: "luxe", name: "Luxe", category: "minimal", palette: ["#0c0a08", "#d4af37", "#f1e3c2"], ratio: "9:16" },
  { id: "y2k", name: "Y2K", category: "fun", palette: ["#ece8ff", "#7c3aed", "#06b6d4"], ratio: "1:1" },
  { id: "dashboard", name: "Dashboard", category: "business", palette: ["#0a0e1a", "#6366f1", "#10b981"], ratio: "16:9" },
];

export const VIDEO_STYLES: VideoStyle[] = CATALOG.map((style) => ({ ...style, recipe: getRecipe(style.id) }));

export function getStyle(id: string | null | undefined) {
  return VIDEO_STYLES.find((s) => s.id === id);
}
