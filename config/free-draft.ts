import { getLogoMotion } from "./logo-motion";
import { isProduct3D } from "./physical-product";
import { getRecipe } from "./recipes";

/**
 * Première vidéo offerte : une seule génération motion classique par compte d'essai.
 * Exclus : templates en vraie 3D, produits 3D, logos animés et voix off (plus coûteux).
 * L'aperçu porte un filigrane ; le téléchargement reste payant.
 */
export function isFreeDraftStyle(styleId: string | null | undefined) {
  return Boolean(styleId) && !getRecipe(styleId).stage && !isProduct3D(styleId) && !getLogoMotion(styleId);
}

export function qualifiesForFreeDraft(input: { styleId: string | null | undefined; voiceover?: unknown }) {
  return isFreeDraftStyle(input.styleId) && !input.voiceover;
}
