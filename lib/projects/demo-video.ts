import type { VideoFormatId } from "@/config/formats";
import type { VideoStyle } from "@/config/styles";
import { demoProps } from "@/remotion/Root";
import type { VideoProps } from "@/remotion/props";
import { getEditorialMotion } from "@/config/editorial-motion";
import { getGraphicMotion } from "@/config/graphic-motion";
import { getReferenceMotion } from "@/config/reference-motion";
import { stageTheme } from "@/config/stage-motion";
import { getTypePoster, posterTransitionAt } from "@/config/type-posters";
import { getLogoMotion } from "@/config/logo-motion";
import { getProductTemplate } from "../../config/physical-product";
import { demoPhysicalProductProps } from "../products/demo";

/** Vidéo de démonstration d'un template (app fictive, écrans factices dans un téléphone). */
export function demoVideoProps(style: VideoStyle, format: VideoFormatId, locale: "en" | "fr" = "en"): VideoProps {
  if (getProductTemplate(style.id)) return demoPhysicalProductProps(style.id, format, locale);
  const logo = getLogoMotion(style.id);
  if (logo) return { ...demoProps, format, locale, palette: [...logo.palette], recipe: style.recipe, screenUrls: [], backgroundUrl: null, musicSrc: null, watermark: false, graph: { schema: 1, language: locale, energy: "balanced", logoEmphasis: false, styleId: style.id, screenFrame: "none", musicTrackId: null, bpm: 120, scenes: [{ id: "wordmark", kind: "intro", title: logo.sample, duration: 6, transition: "cut" }] } };
  const energy = style.recipe.energy;
  const poster = getTypePoster(style.id);
  if (poster) return {
    ...demoProps, appName: poster.name, format, locale, palette: style.palette, recipe: style.recipe,
    logoUrl: null, screenUrls: [], websiteUrl: null, musicSrc: null, watermark: false,
    graph: { schema: 1, language: locale, energy, logoEmphasis: false, styleId: style.id, screenFrame: "phone", logoLayout: "signature", musicTrackId: null, bpm: 120,
      scenes: ["intro", "logo", "feature", "screens", "screens", "cta"].map((kind, i) => ({
        id: `poster-${i}`, kind: kind as "intro" | "logo" | "feature" | "screens" | "cta",
        title: poster.name.toUpperCase(), subtitle: "", duration: 3, transition: posterTransitionAt(style.recipe.transitions, i),
        ...(kind === "screens" ? i === 3
          ? { screenFrame: "phone" as const, layout: style.recipe.screens, screenCount: 2 }
          : { screenFrame: "browser" as const, layout: "hero" as const, screenCount: 1 } : {}),
      })),
    },
  };
  // Univers 3D : une scène à trois appareils pour montrer la mise en scène multi-écrans
  if (style.recipe.stage) {
    const fr = locale === "fr";
    const theme = stageTheme(style.recipe.stage);
    const scenes = [
      { kind: "intro", title: fr ? theme.headline.fr : theme.headline.en, subtitle: fr ? "Votre progression, enfin visible" : "Your progress, finally visible", duration: 3.2 },
      { kind: "screens", title: fr ? "Suivi en direct" : "Live tracking", duration: 3 },
      { kind: "feature", title: fr ? "Tout au même endroit" : "Everything in one place", subtitle: fr ? "Simple. Rapide. Puissant." : "Simple. Fast. Powerful.", duration: 3 },
      { kind: "screens", title: fr ? "Chaque écran compte" : "Every screen counts", duration: 3, screenCount: 3 },
      { kind: "logo", title: "Flowly", duration: 2.6 },
      { kind: "cta", title: fr ? "Essaie Flowly" : "Try Flowly", subtitle: fr ? "Disponible dès aujourd’hui" : "Available today", duration: 3 },
    ] as const;
    return {
      ...demoProps, format, locale, palette: style.palette, recipe: style.recipe, screenUrls: [], backgroundUrl: null, musicSrc: null, watermark: false,
      graph: {
        ...demoProps.graph, language: locale, energy, styleId: style.id, screenFrame: "phone",
        scenes: scenes.map((scene, i) => ({ ...scene, id: `stage-${i}`, transition: i === 0 ? "fade" : style.recipe.transitions[(i - 1) % style.recipe.transitions.length] })),
      },
    };
  }
  const editorial = getEditorialMotion(style.id);
  const graphic = getGraphicMotion(style.id);
  const reference = getReferenceMotion(style.id);
  const graphicTitles = locale === "fr"
    ? [({ anvil: "UN IMPACT FRANC.", tessera: "ASSEMBLEZ LES IDÉES.", suture: "RELIEZ L’INATTENDU.", ratchet: "LANCEZ LE MOUVEMENT.", interlock: "lumière", torque: "CHANGEZ L’ÉLAN.", cadence: "TROUVEZ LE RYTHME.", flux: "FOCUS", optic: "FAITES DU BRUIT", lens: "Créer", carousel: "ENTREZ DANS LE VIDE", offprint: "SENS", patina: "HOLO", gloss: "GLOSS", lustre: "LUSTRE", hollow: "PLUS FORT", cursive: "NIVEAU supérieur", overlap: "Différent", bloom: "VIBE", reflect: "ENTREZ", "vector-beat": "PRENEZ LA DIRECTION.", blackout: "MOINS DE BRUIT.", voltage: "MONTEZ LE SIGNAL.", sticker: "PLEIN PHARE" } as Record<string, string>)[style.id], style.name, "UNE IDÉE FORTE.", "PLUS D’IMPACT.", "LE MOUVEMENT JUSTE.", "À VOUS DE JOUER."]
    : [graphic?.headline, style.name, "ONE STRONG IDEA.", "MORE IMPACT.", "THE RIGHT MOVE.", "MAKE YOUR MOVE."];
  const editorialTitles = locale === "fr"
    ? [({ contact: "CHOISISSEZ LE BON PLAN.", folio: "Ouvrez un nouveau chapitre.", broadsheet: "LA PROCHAINE UNE.", crosscut: "CHANGEZ DE PERSPECTIVE.", column: "Un regard nouveau.", aspect: "Affirmez votre regard.", interval: "ENTRE DEUX INSTANTS.", memento: "Une empreinte durable.", cadran: "Donner forme au regard.", passage: "TOUJOURS PLUS LOIN.", reverie: "La beauté de l’inattendu.", duplex: "Une histoire, deux regards.", terracotta: "CRÉER AVEC INTENTION.", silhouette: "Une empreinte singulière.", bulletin: "CHAQUE IDÉE COMPTE.", montage: "CHANGEZ DE PERSPECTIVE.", fervor: "Les idées rayonnent.", horizon: "Au-delà des habitudes.", dispatch: "FAITES DU BRUIT.", maison: "Une autre perspective.", oblique: "LES IDÉES EN MOUVEMENT.", solstice: "Trouver son horizon.", archive: "Une histoire à raconter.", linea: "Moins, mais mieux.", slate: "Une assurance tranquille." } as Record<string, string>)[style.id], style.name, "DIRECTION CRÉATIVE", "UN AUTRE REGARD", "VOTRE PROCHAIN CHAPITRE", "CRÉONS LA SUITE."]
    : [editorial?.headline, style.name, "CREATIVE DIRECTION", "A NEW PERSPECTIVE", "YOUR NEXT CHAPTER", "LET’S CREATE."];
  return {
    ...demoProps,
    ...(editorial ? { screenUrls: [editorial.photo] } : {}),
    ...(reference?.photo ? { backgroundUrl: reference.photo, screenUrls: [reference.photo], screenRatios: [1.5] } : {}),
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
        ...(reference ? { ...(scene.kind === "stat" ? { kind: "feature" as const } : {}), title: (locale === "fr" ? [reference.fr, style.name, "UNE AUTRE VISION.", "MARQUEZ L’INSTANT.", "LE SENS DU DÉTAIL.", "CRÉONS LA SUITE."] : [reference.headline, style.name, "A DIFFERENT VISION.", "MAKE IT MATTER.", "EVERY DETAIL COUNTS.", "CREATE WHAT’S NEXT."])[i] ?? style.name, subtitle: "", screenFrame: "none" as const } : {}),
        ...(!reference && !editorial && !graphic && locale === "en" ? [
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
