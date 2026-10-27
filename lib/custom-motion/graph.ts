import { getTrack } from "@/config/music";
import { getRecipe } from "@/config/recipes";
import type { VideoFormatId } from "@/config/formats";
import type { Scene, SceneGraph } from "@/lib/projects/scenes";
import type { VideoProps } from "@/remotion/props";
import { COMMUNITY_PREFIX, sceneTexts, type CustomDemo, type CustomMotionMeta, type CustomRuntime, type CustomSceneType } from "./contract";

/** Titre lisible d'une scène (historique, frise, chat) : son premier texte, sinon le nom du type. */
export function customSceneTitle(type: CustomSceneType | undefined, texts: Record<string, string> | undefined) {
  const first = type?.texts.map((field) => texts?.[field.key]?.trim()).find(Boolean);
  return (first ?? type?.label ?? "Scène").slice(0, 80);
}

/** Scène du plan pour un type déclaré. */
export function customScene(meta: CustomMotionMeta, typeId: string, id: string, texts: Record<string, string>, duration?: number): Scene {
  const type = meta.sceneTypes.find((t) => t.type === typeId);
  const clean = sceneTexts(type, texts);
  return {
    id, kind: "feature", customType: typeId, texts: clean,
    title: customSceneTitle(type, clean),
    duration: Math.min(type?.maxDuration ?? 20, Math.max(type?.minDuration ?? 0.5, duration ?? type?.defaultDuration ?? 3)),
    transition: "cut",
  };
}

/** Plan d'un projet créé depuis une vidéo Créations : copie du contenu par défaut. */
export function communityGraph(versionId: string, meta: CustomMotionMeta, demo: CustomDemo, locale: "fr" | "en", stableIds = false): SceneGraph {
  const track = getTrack(demo.musicTrackId);
  return {
    schema: 1, language: locale, energy: "balanced", logoEmphasis: false,
    styleId: `${COMMUNITY_PREFIX}${versionId}`,
    colors: [...demo.colors],
    musicTrackId: track ? track.id : null,
    bpm: track?.bpm ?? demo.bpm,
    ...(track?.beatOffset && { beatOffset: track.beatOffset }),
    scenes: demo.scenes.map((scene, i) => customScene(meta, scene.type, stableIds ? `scene-${i}demo` : `scene-${i}${Math.random().toString(36).slice(2, 7)}`, scene.texts, scene.duration)),
  };
}

/** Props de lecture d'une vidéo Créations avec son contenu par défaut (galerie, studio). */
export function customPreviewProps(runtime: CustomRuntime, demo: CustomDemo, format: VideoFormatId, locale: "fr" | "en", graph?: SceneGraph): VideoProps {
  const scenes = graph ?? communityGraph("preview", runtime.meta, demo, locale, true);
  const palette = demo.colors;
  return {
    appName: demo.appName || "Flowly", locale, format,
    palette: [palette[0], palette[1] ?? palette[0], palette[2] ?? palette[1] ?? palette[0]],
    brandColors: palette,
    recipe: getRecipe(null),
    graph: scenes,
    logoUrl: null, backgroundUrl: null, screenUrls: [], websiteUrl: null,
    musicSrc: scenes.musicTrackId ? getTrack(scenes.musicTrackId)?.src ?? null : null,
    watermark: false,
    custom: runtime,
  };
}
