import { getStyle, type SceneKind } from "@/config/styles";

/** Palette + scène d'aperçu d'un projet : le style choisi, teinté par les couleurs de la marque. */
export function projectVisual(project: { styleId: string | null; colors: string[] }): {
  palette: [string, string, string];
  scene: SceneKind;
} {
  const style = getStyle(project.styleId);
  const [primary, secondary] = project.colors;
  if (!style) return { palette: ["#12062b", primary ?? "#7c3aed", secondary ?? "#f472b6"], scene: "blobs" };
  return { palette: [style.palette[0], primary ?? style.palette[1], secondary ?? style.palette[2]], scene: style.recipe.background };
}
