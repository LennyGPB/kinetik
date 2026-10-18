import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoProps } from "@/remotion/Root";
import type { VideoProps } from "@/remotion/props";
import { getEditorialMotion } from "@/config/editorial-motion";
import { getGraphicMotion } from "@/config/graphic-motion";

/** Vidéo de démonstration d'un template (app fictive, écrans factices dans un téléphone). */
export function demoVideoProps(style: VideoStyle, format: VideoFormatId, locale: "en" | "fr" = "en"): VideoProps {
  const energy = style.recipe.energy;
  const editorial = getEditorialMotion(style.id);
  const graphic = getGraphicMotion(style.id);
  const graphicTitles = locale === "fr"
    ? [({ anvil: "UN IMPACT FRANC.", tessera: "ASSEMBLEZ LES IDÉES.", suture: "RELIEZ L’INATTENDU.", ratchet: "LANCEZ LE MOUVEMENT.", interlock: "TOUT PREND PLACE.", torque: "CHANGEZ L’ÉLAN.", cadence: "TROUVEZ LE RYTHME.", "vector-beat": "PRENEZ LA DIRECTION.", blackout: "MOINS DE BRUIT.", voltage: "MONTEZ LE SIGNAL." } as Record<string, string>)[style.id], style.name, "UNE IDÉE FORTE.", "PLUS D’IMPACT.", "LE MOUVEMENT JUSTE.", "À VOUS DE JOUER."]
    : [graphic?.headline, style.name, "ONE STRONG IDEA.", "MORE IMPACT.", "THE RIGHT MOVE.", "MAKE YOUR MOVE."];
  const editorialTitles = locale === "fr"
    ? [({ broadsheet: "LA PROCHAINE UNE.", crosscut: "CHANGEZ DE PERSPECTIVE.", offprint: "LAISSEZ VOTRE EMPREINTE.", column: "Un regard nouveau.", aspect: "Affirmez votre regard.", patina: "La beaute du detail.", interval: "ENTRE DEUX INSTANTS.", memento: "Une empreinte durable.", cadran: "Donner forme au regard.", passage: "TOUJOURS PLUS LOIN.", reverie: "La beauté de l’inattendu.", duplex: "Une histoire, deux regards.", terracotta: "CRÉER AVEC INTENTION.", silhouette: "Une empreinte singulière.", bulletin: "CHAQUE IDÉE COMPTE.", montage: "CHANGEZ DE PERSPECTIVE.", fervor: "Les idées rayonnent.", horizon: "Au-delà des habitudes.", dispatch: "FAITES DU BRUIT.", maison: "Une autre perspective.", oblique: "LES IDÉES EN MOUVEMENT.", solstice: "Trouver son horizon.", archive: "Une histoire à raconter." } as Record<string, string>)[style.id], style.name, "DIRECTION CRÉATIVE", "UN AUTRE REGARD", "VOTRE PROCHAIN CHAPITRE", "CRÉONS LA SUITE."]
    : [editorial?.headline, style.name, "CREATIVE DIRECTION", "A NEW PERSPECTIVE", "YOUR NEXT CHAPTER", "LET’S CREATE."];
  return {
    ...demoProps,
    ...(editorial ? { screenUrls: [editorial.photo] } : {}),
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
        ...(graphic ? { title: graphicTitles[i] ?? style.name, subtitle: "", screenFrame: "none" as const } : {}),
        ...(editorial ? { title: editorialTitles[i] ?? style.name, subtitle: "", screenFrame: "none" as const } : {}),
        ...(!editorial && !graphic && locale === "en" ? [
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
