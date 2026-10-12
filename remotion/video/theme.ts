import { createContext, useContext, type CSSProperties } from "react";
import { useVideoConfig } from "remotion";
import { DEFAULT_RECIPE, type Recipe } from "../../config/recipes";
import { brandFont } from "./brand-fonts";
import { TYPOGRAPHY } from "./fonts";

export { bodyFont, displayFont } from "./fonts";

/** Recette du template courant (fournie par KinetikVideo). */
export const RecipeContext = createContext<Recipe>(DEFAULT_RECIPE);

export function useRecipe() {
  return useContext(RecipeContext);
}

/** Style des titres : police du brand kit si l'utilisateur l'a choisie, sinon typographie de la recette. */
export function useTitleFont(): CSSProperties {
  const recipe = useRecipe();
  const brand = recipe.brandFonts && brandFont(recipe.brandFonts.heading);
  if (brand) return { fontFamily: brand.fontFamily, fontWeight: brand.bold, letterSpacing: "-0.03em" };
  return TYPOGRAPHY[recipe.typography].title;
}

/** Multiplicateur de taille des titres propre à la police (voir fonts.ts). */
export function useTitleScale() {
  const recipe = useRecipe();
  return recipe.brandFonts ? 1 : TYPOGRAPHY[recipe.typography].scale;
}

/** Police des textes secondaires (Inter, la mono pour les recettes "mono", ou celle du brand kit). */
export function useBodyFont() {
  const recipe = useRecipe();
  const brand = recipe.brandFonts && brandFont(recipe.brandFonts.body);
  return brand ? brand.fontFamily : TYPOGRAPHY[recipe.typography].body;
}

/** Luminance relative approximative (0 → 1) d'une couleur hex. */
export function luminance(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

export function isLight(hex: string) {
  return luminance(hex) > 0.6;
}

export function textColorOn(bg: string) {
  return isLight(bg) ? "#0b0b14" : "#ffffff";
}

/**
 * Unité de mise en page proportionnelle au plus petit côté (1u = 1 % ≈ "vmin"),
 * pour que la même composition fonctionne en 16:9, 9:16 et 1:1.
 */
export function useUnit() {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 100;
}

export function useIsPortrait() {
  const { width, height } = useVideoConfig();
  return height > width;
}

/** Durée d'un temps musical, en images. */
export function beatFrames(fps: number, bpm: number) {
  return (fps * 60) / (bpm || 120);
}

/**
 * Grille des temps pour le calque courant : `phaseFrames` = image (dans le repère du calque) où tombe un temps.
 * KinetikVideo la fournit pour la vidéo entière, puis la décale pour chaque scène (dont les images repartent de 0).
 */
export const BeatContext = createContext({ bpm: 120, phaseFrames: 0 });

/** Pulsation 0 → 1 à chaque temps (décroissance rapide), calée sur le BPM et sur le premier temps du morceau. */
export function beatPulse(frame: number, fps: number, bpm: number, phaseFrames = 0) {
  const beat = beatFrames(fps, bpm);
  const position = ((((frame - phaseFrames) % beat) + beat) % beat) / beat;
  return Math.pow(1 - position, 4);
}

/** Pulsation et durée d'un temps pour le calque courant. */
export function useBeat() {
  const { bpm, phaseFrames } = useContext(BeatContext);
  const { fps } = useVideoConfig();
  return { beatFrames: beatFrames(fps, bpm), pulse: (frame: number) => beatPulse(frame, fps, bpm, phaseFrames) };
}
