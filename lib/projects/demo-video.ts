import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoProps } from "@/remotion/Root";
import type { VideoProps } from "@/remotion/props";

/** Vidéo de démonstration d'un template (app fictive, écrans factices dans un téléphone). */
export function demoVideoProps(style: VideoStyle, format: VideoFormatId, locale: "en" | "fr" = "en"): VideoProps {
  const energy = style.recipe.energy;
  return {
    ...demoProps,
    format,
    locale,
    palette: style.palette,
    recipe: style.recipe,
    watermark: false,
    graph: {
      ...demoProps.graph,
      language: locale,
      energy,
      screenFrame: "phone",
      // On fait tourner les transitions autorisées par la recette pour toutes les montrer
      scenes: demoProps.graph.scenes.map((scene, i) => ({
        ...scene,
        ...(locale === "en" ? [
          { title: "Meet Flowly", subtitle: "The future of your workflow" },
          { title: "Flowly" },
          { title: "Everything in one place", subtitle: "Simple. Fast. Powerful." },
          { title: "+40%", subtitle: "time saved every week" },
          { title: "Built for speed" },
          { title: "Try Flowly", subtitle: "Available today" },
        ][i] : {}),
        transition: i === 0 ? scene.transition : style.recipe.transitions[(i - 1) % style.recipe.transitions.length],
      })),
    },
  };
}
