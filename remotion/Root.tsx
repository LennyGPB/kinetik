import { Composition } from "remotion";
import { RECIPES } from "../config/recipes";
import { calculateVideoMetadata, DIMENSIONS, durationInFrames, FPS, type VideoProps } from "./props";
import { KinetikVideo } from "./video/KinetikVideo";

/** Props de démo pour Remotion Studio (remplacées par celles du projet lors d'un rendu). */
export const demoProps: VideoProps = {
  appName: "Flowly",
  format: "LANDSCAPE",
  palette: ["#140a2e", "#7c3aed", "#f472b6"],
  recipe: RECIPES["gradient-flow"],
  logoUrl: null,
  screenUrls: [],
  websiteUrl: "https://flowly.app",
  musicSrc: null,
  watermark: false,
  graph: {
    schema: 1,
    energy: "balanced",
    logoEmphasis: false,
    musicTrackId: "launch-day",
    bpm: 128,
    scenes: [
      { id: "intro-0", kind: "intro", title: "Voici Flowly", subtitle: "Le futur de ton workflow", duration: 5, transition: "fade" },
      { id: "logo-1", kind: "logo", title: "Flowly", duration: 4, transition: "zoom" },
      { id: "feature-2", kind: "feature", title: "Tout au même endroit", subtitle: "Simple. Rapide. Puissant.", duration: 7, transition: "slide" },
      { id: "screens-3", kind: "screens", title: "Pensé pour aller vite", duration: 7, transition: "slide" },
      { id: "cta-4", kind: "cta", title: "Essaie Flowly", subtitle: "Disponible dès aujourd'hui", duration: 7, transition: "fade" },
    ],
  },
};

export function RemotionRoot() {
  return (
    <Composition
      id="Kinetik"
      component={KinetikVideo}
      defaultProps={demoProps}
      calculateMetadata={calculateVideoMetadata}
      fps={FPS}
      durationInFrames={durationInFrames(demoProps.graph)}
      {...DIMENSIONS[demoProps.format]}
    />
  );
}
