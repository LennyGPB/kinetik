import { MAX_SCREEN_COUNT, type SceneGraph } from "./scenes";

/** Exact half-second allocation, without dumping rounding errors onto the final CTA. */
export function generationDurations(scenes: SceneGraph["scenes"], target: number) {
  if (!scenes.length) return [];
  const units = Math.max(scenes.length * 2, Math.min(scenes.length * 40, Math.round(target * 2)));
  const hasContent = scenes.some((s) => s.kind !== "intro" && s.kind !== "logo");
  const caps = scenes.map((s) => hasContent && (s.kind === "intro" || s.kind === "logo") ? 3 : 40);
  const weights = scenes.map((s) => Number.isFinite(s.duration) ? Math.max(1, s.duration) : 2);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const allocated = scenes.map(() => 2);
  for (let left = units - scenes.length * 2; left > 0; left--) {
    let best = -1;
    let deficit = -Infinity;
    for (let i = 0; i < scenes.length; i++) {
      if (allocated[i] >= caps[i]) continue;
      const score = weights[i] / weightSum * units - allocated[i];
      if (score > deficit) { best = i; deficit = score; }
    }
    // Degenerate plans containing too little product content still preserve the requested length.
    if (best < 0) best = allocated.indexOf(Math.min(...allocated));
    allocated[best]++;
  }
  return allocated.map((value) => value / 2);
}

/** Apply only to the initial generation, never to intentional manual edits. */
export function prepareFirstVideo(graph: SceneGraph, ctx: { locale?: "en" | "fr"; duration: number; screenUrls: string[]; logoUrl: string | null; styleId: string | null; colors: string[] }) {
  let cursor = 0;
  const limit = Math.max(1, Math.min(12, Math.floor(ctx.duration)));
  const source = graph.scenes.length > limit ? [...graph.scenes.slice(0, limit - 1), graph.scenes.at(-1)!] : graph.scenes;
  const scenes = source.map((scene) => {
    if (scene.kind === "logo" && !ctx.logoUrl) return { ...scene, kind: "feature" as const };
    if (scene.kind !== "screens") return scene;
    const { screens: requested, screenCount, layout, focus, focuses, ...rest } = scene;
    if (!ctx.screenUrls.length) return { ...rest, kind: "feature" as const };
    const valid = requested?.filter((src) => ctx.screenUrls.includes(src));
    const count = Math.min(MAX_SCREEN_COUNT, ctx.screenUrls.length, screenCount ?? MAX_SCREEN_COUNT);
    const screens = valid?.length ? [...new Set(valid)].slice(0, MAX_SCREEN_COUNT) : Array.from({ length: count }, () => ctx.screenUrls[cursor++ % ctx.screenUrls.length]);
    return { ...rest, screens, screenCount: screens.length, ...(layout && { layout }), ...(focus && ctx.screenUrls.includes(focus.src) && { focus }), ...(focuses && { focuses: focuses.filter((f) => ctx.screenUrls.includes(f.src)).slice(0, 6) }) };
  });
  const durations = generationDurations(scenes, ctx.duration);
  return { ...graph, language: ctx.locale ?? "fr", ...(ctx.styleId && { styleId: ctx.styleId }), colors: [...ctx.colors], scenes: scenes.map((scene, i) => ({ ...scene, duration: durations[i] })) };
}
