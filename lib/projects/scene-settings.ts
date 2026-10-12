import type { Scene, SceneGraph } from "./scenes";

/** Effective settings shared by the renderer and scoped AI requests. */
export function sceneSettings(graph: SceneGraph, scene: Scene): SceneGraph {
  return {
    ...graph,
    energy: scene.energy ?? graph.energy,
    titleAnimation: scene.titleAnimation ?? graph.titleAnimation,
    logoLayout: scene.logoLayout ?? graph.logoLayout,
    logoBackground: scene.logoBackground ?? graph.logoBackground,
    logoEmphasis: scene.logoEmphasis ?? graph.logoEmphasis,
    screenFrame: scene.screenFrame ?? graph.screenFrame,
  };
}
