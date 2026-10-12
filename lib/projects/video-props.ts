import { getRecipe } from "@/config/recipes";
import type { VideoProps } from "@/remotion/props";
import type { SceneGraph } from "./scenes";
import type { EditorProject } from "./types";
import { projectVisual } from "./visuals";

/** Ce qu'il faut d'un projet pour le rendre (éditeur, page de partage, export). */
export type VideoSource = Pick<EditorProject, "appName" | "format" | "styleId" | "colors" | "logoUrl" | "screenUrls" | "screenRatios" | "websiteUrl" | "musicSrc">;

/** Construit les props de la composition Remotion à partir d'un projet et d'une version. */
export function buildVideoProps(project: VideoSource, graph: SceneGraph, watermark: boolean): VideoProps {
  // Le style de la version (changé depuis l'éditeur) prime sur celui du projet
  const styleId = graph.styleId ?? project.styleId;
  const { palette } = projectVisual({ styleId, colors: graph.colors ?? project.colors });
  return {
    appName: project.appName,
    format: project.format,
    palette,
    recipe: getRecipe(styleId),
    graph,
    logoUrl: project.logoUrl,
    screenUrls: project.screenUrls,
    screenRatios: project.screenRatios,
    websiteUrl: project.websiteUrl,
    musicSrc: project.musicSrc,
    watermark,
  };
}
