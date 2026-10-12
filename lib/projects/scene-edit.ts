import type { Scene, SceneGraph } from "./scenes";
import { overlayApplies } from "./overlays";
import { SCENE_MAX_SECONDS, SCENE_MIN_SECONDS, VIDEO_MAX_SECONDS } from "./timeline";
import { sceneSettings } from "./scene-settings";

/** Server boundary: preserve every other scene and every video-wide setting. */
export function mergeSceneEdit(before: SceneGraph, edited: SceneGraph, sceneId: string): SceneGraph {
  const target = before.scenes.find((scene) => scene.id === sceneId);
  if (!target) throw new Error("Scene not found");
  const candidate = edited.scenes.find((scene) => scene.id === sceneId && scene.kind === target.kind)
    ?? edited.scenes.find((scene) => scene.kind === target.kind);
  if (!candidate) throw new Error("Target scene missing from AI response");
  const othersDuration = before.scenes.reduce((sum, scene) => sum + (scene.id === sceneId ? 0 : scene.duration), 0);
  const next: Scene = {
    ...target,
    ...candidate,
    id: target.id,
    kind: target.kind,
    duration: Math.min(VIDEO_MAX_SECONDS - othersDuration, SCENE_MAX_SECONDS, Math.max(SCENE_MIN_SECONDS, Number.isFinite(candidate.duration) ? candidate.duration : target.duration)),
  };
  const effective = sceneSettings(before, target);
  if (edited.energy !== effective.energy) next.energy = edited.energy;
  if (edited.titleAnimation !== effective.titleAnimation) next.titleAnimation = edited.titleAnimation;
  if (edited.logoLayout !== effective.logoLayout) next.logoLayout = edited.logoLayout;
  if (edited.logoBackground !== effective.logoBackground) next.logoBackground = edited.logoBackground;
  if (edited.logoEmphasis !== effective.logoEmphasis) next.logoEmphasis = edited.logoEmphasis;
  if (edited.screenFrame !== effective.screenFrame) next.screenFrame = edited.screenFrame;
  const otherIds = before.scenes.filter((scene) => scene.id !== sceneId).map((scene) => scene.id);
  const preserved = (before.overlays ?? []).flatMap((layer) => {
    if (!overlayApplies(layer, sceneId)) return [layer];
    const targets = layer.sceneIds === null ? otherIds : layer.sceneIds.filter((id) => id !== sceneId);
    return targets.length ? [{ ...layer, sceneIds: targets }] : [];
  });
  const selected = (edited.overlays ?? []).filter((layer) => overlayApplies(layer, sceneId)).map((layer) => ({ ...layer, id: `${layer.id.slice(0, 40)}-${sceneId.slice(0, 20)}`, sceneIds: [sceneId] }));
  return { ...before, overlays: [...preserved, ...selected], scenes: before.scenes.map((scene) => scene.id === sceneId ? next : scene) };
}
