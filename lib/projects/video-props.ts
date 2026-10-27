import { getRecipe } from "@/config/recipes";
import { getTrack } from "@/config/music";
import type { VideoProps } from "@/remotion/props";
import type { SceneGraph } from "./scenes";
import type { EditorProject } from "./types";
import { projectVisual } from "./visuals";
import { resolveStageTransitions } from "../../config/stage-motion";

/** Ce qu'il faut d'un projet pour le rendre (éditeur, page de partage, export). */
export type VideoSource = Pick<EditorProject, "appName" | "format" | "styleId" | "colors" | "logoUrl" | "backgroundUrl" | "screenUrls" | "screenRatios" | "websiteUrl" | "musicSrc" | "locale" | "custom">;

/** Construit les props de la composition Remotion à partir d'un projet et d'une version. */
export function buildVideoProps(project: VideoSource, graph: SceneGraph, watermark: boolean): VideoProps {
  // Le style de la version (changé depuis l'éditeur) prime sur celui du projet
  const styleId = graph.styleId ?? project.styleId;
  const { palette } = projectVisual({ styleId, colors: graph.colors ?? project.colors });
  const colors = graph.colors ?? project.colors;
  const recipe = getRecipe(styleId);
  return {
    appName: project.appName,
    locale: graph.language ?? project.locale ?? "fr",
    format: project.format,
    palette: graph.pitch && colors.length >= 2 ? [colors[0], colors[1], colors[2] ?? colors[1]] : palette,
    brandColors: graph.colors ?? project.colors,
    recipe: graph.pitch ? { ...recipe, graphicTreatment: undefined, referenceMotion: undefined, stage: undefined, photoTreatment: undefined, background: "clean", titleAnimation: "words", camera: "still", effects: [] } : recipe,
    graph: resolveStageTransitions(graph, recipe.stage),
    logoUrl: project.logoUrl,
    backgroundUrl: project.backgroundUrl ?? null,
    screenUrls: project.screenUrls,
    screenRatios: project.screenRatios,
    websiteUrl: project.websiteUrl,
    musicSrc: graph.musicTrackId ? getTrack(graph.musicTrackId)?.src ?? null : project.musicSrc,
    watermark,
    custom: project.custom ?? null,
  };
}
