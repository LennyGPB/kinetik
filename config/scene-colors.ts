import type { SceneKind } from "@/lib/projects/scenes";

/**
 * Couleur de chaque type de scène dans les frises (éditeur, démo de la landing).
 * Une teinte nettement distincte par type, en aplat adouci ; texte foncé sur les teintes claires pour rester lisible.
 * Le violet n'est volontairement attribué à aucun type : il est réservé à la sélection et aux éléments actifs de l'interface.
 */
export const SCENE_COLORS: Record<SceneKind, { bg: string; text: string }> = {
  intro: { bg: "bg-indigo-400", text: "text-indigo-950" },
  logo: { bg: "bg-slate-400", text: "text-slate-950" },
  feature: { bg: "bg-rose-400", text: "text-rose-950" },
  screens: { bg: "bg-sky-400", text: "text-sky-950" },
  stat: { bg: "bg-amber-300", text: "text-amber-950" },
  quote: { bg: "bg-emerald-400", text: "text-emerald-950" },
  cta: { bg: "bg-orange-400", text: "text-orange-950" },
  headlines: { bg: "bg-lime-300", text: "text-lime-950" },
};
