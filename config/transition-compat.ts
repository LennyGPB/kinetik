import { TRANSITIONS, type Transition } from "../lib/projects/scenes";
import { getProductTemplate } from "./physical-product";
import { getRecipe } from "./recipes";
import { CAMERA_TRANSITIONS, STAGE_TRANSITIONS } from "./stage-motion";

/**
 * Transitions qu'une scène peut prendre sur un template, au-delà de celles qu'il propose par défaut (recipe.transitions) :
 * - templates 2D : toutes les transitions génériques (remotion/video/transitions.tsx), sauf celles des décors 3D ;
 * - Stage : celles du template, plus les gestes de caméra universels, le tour de plateau, la coupe et le fondu
 *   (les autres transitions 3D animent un décor précis : soleil de Monument, survol de Kiosque…) ;
 * - produits physiques et logos animés : celles du template (chorégraphie propre).
 */
export function compatibleTransitions(styleId: string | null | undefined): Transition[] {
  const recipe = getRecipe(styleId);
  if (getProductTemplate(styleId) || recipe.logoMotion) return [...recipe.transitions];
  if (recipe.stage) return [...new Set<Transition>([...recipe.transitions, ...CAMERA_TRANSITIONS, "turntable", "cut", "fade"])];
  const stageOnly = new Set<Transition>(STAGE_TRANSITIONS);
  return TRANSITIONS.filter((transition) => !stageOnly.has(transition));
}
