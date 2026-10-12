import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoProps } from "@/remotion/Root";
import type { VideoProps } from "@/remotion/props";

/** Vidéo de démonstration d'un template (app fictive, écrans factices dans un téléphone). */
export function demoVideoProps(style: VideoStyle, format: VideoFormatId): VideoProps {
  const energy = style.recipe.energy;
  return {
    ...demoProps,
    format,
    palette: style.palette,
    recipe: style.recipe,
    watermark: false,
    graph: {
      ...demoProps.graph,
      energy,
      screenFrame: "phone",
      // On fait tourner les transitions autorisées par la recette pour toutes les montrer
      scenes: demoProps.graph.scenes.map((scene, i) => ({
        ...scene,
        transition: i === 0 ? scene.transition : style.recipe.transitions[(i - 1) % style.recipe.transitions.length],
      })),
    },
  };
}
