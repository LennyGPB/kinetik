// ⚠️ Ce dossier est aussi bundlé par Remotion (webpack) : imports RELATIFS uniquement, pas d'alias "@/".
import type { CalculateMetadataFunction } from "remotion";
import type { VideoFormatId } from "../config/formats";
import type { Recipe } from "../config/recipes";
import type { SceneGraph } from "../lib/projects/scenes";

export const FPS = 30;

export const DIMENSIONS: Record<VideoFormatId, { width: number; height: number }> = {
  LANDSCAPE: { width: 1920, height: 1080 },
  PORTRAIT: { width: 1080, height: 1920 },
  SQUARE: { width: 1080, height: 1080 },
};

/** Tout ce dont la composition a besoin pour rendre une vidéo. */
export type VideoProps = {
  locale?: "en" | "fr";
  appName: string;
  format: VideoFormatId;
  /** [fond, principale, accent] */
  palette: [string, string, string];
  /** Complete brand palette; secondary colours are distributed across scenes. */
  brandColors?: string[];
  /** Recette du template : typo, fond, mise en scène, animations… (config/recipes.ts) */
  recipe: Recipe;
  graph: SceneGraph;
  logoUrl: string | null;
  backgroundUrl?: string | null;
  screenUrls: string[];
  /** Proportions (largeur / hauteur) de chaque screen, dans le même ordre ; null si inconnues. Sert à la mise en avant. */
  screenRatios?: (number | null)[];
  websiteUrl: string | null;
  musicSrc: string | null;
  watermark: boolean;
};

export function durationInFrames(graph: SceneGraph) {
  return Math.max(FPS, Math.round(graph.scenes.reduce((sum, s) => sum + s.duration, 0) * FPS));
}

export const calculateVideoMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: durationInFrames(props.graph),
  fps: FPS,
  ...DIMENSIONS[props.format],
});

/** Les URLs relatives (/api/uploads/…) doivent être absolues hors navigateur (rendu CLI / Lambda). */
export function absolutize(props: VideoProps, baseUrl: string): VideoProps {
  const abs = (url: string | null) => (url && url.startsWith("/") ? new URL(url, baseUrl).toString() : url);
  return {
    ...props,
    graph: { ...props.graph, ...(props.graph.recording && { recording: { ...props.graph.recording, src: abs(props.graph.recording.src)! } }) },
    logoUrl: abs(props.logoUrl),
    backgroundUrl: abs(props.backgroundUrl ?? null),
    musicSrc: abs(props.musicSrc),
    screenUrls: props.screenUrls.map((u) => abs(u) ?? u),
  };
}
