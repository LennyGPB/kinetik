import { getStyle, type SceneKind } from "@/config/styles";
import { getLogoMotion } from "../../config/logo-motion";

/** Fond clair/sombre du template, teinté uniquement avec la couleur de marque. */
function brandBackground(templateBackground: string, primary: string) {
  const rgb = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const [r, g, b] = rgb(templateBackground);
  const light = r * 0.299 + g * 0.587 + b * 0.114 > 160;
  const base = light ? 255 : 0;
  const tint = light ? 0.06 : 0.08;
  return `#${rgb(primary).map((channel) => Math.round(base * (1 - tint) + channel * tint).toString(16).padStart(2, "0")).join("")}`;
}

/** Palette + scène d'aperçu d'un projet : le style choisi, teinté par les couleurs de la marque. */
export function projectVisual(project: { styleId: string | null; colors: string[] }): {
  palette: [string, string, string];
  scene: SceneKind;
} {
  const style = getStyle(project.styleId);
  if (getLogoMotion(project.styleId)) return { palette: [project.colors[0] ?? style!.palette[0], project.colors[1] ?? style!.palette[1], project.colors[2] ?? style!.palette[2]], scene: "clean" };
  const [primary, secondary] = project.colors;
  const defaults: [string, string, string] = style?.palette ?? ["#12062b", "#7c3aed", "#f472b6"];
  return {
    palette: primary
      ? [brandBackground(defaults[0], primary), primary, secondary ?? primary]
      : defaults,
    scene: style?.recipe.background ?? "blobs",
  };
}
