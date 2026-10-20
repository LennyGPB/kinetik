import type { Scene } from "./scenes";

/** Shared frame boundaries for the editor, narration and renderer. */
export function sceneTimeline(scenes: Scene[], fps: number, bpm: number, phaseSeconds = 0) {
  const frames = scenes.map((scene) => Math.max(1, Math.round(scene.duration * fps)));
  const starts = frames.map((_, i) => frames.slice(0, i).reduce((sum, f) => sum + f, 0));
  const total = frames.reduce((sum, f) => sum + f, 0);
  const beat = (fps * 60) / (bpm || 120);
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].transition !== "cut") continue;
    const phase = phaseSeconds * fps;
    const snapped = Math.round(Math.round((starts[i] - phase) / beat) * beat + phase);
    const nextStart = i + 1 < scenes.length ? starts[i + 1] : total;
    starts[i] = Math.max(starts[i - 1] + fps, Math.min(nextStart - fps, snapped));
  }
  return scenes.map((scene, i) => ({ scene, from: starts[i], duration: (i + 1 < scenes.length ? starts[i + 1] : total) - starts[i] }));
}
