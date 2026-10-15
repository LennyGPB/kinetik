import assert from "node:assert/strict";
import { test } from "node:test";
import { generationDurations, prepareFirstVideo } from "./generation";
import { totalDuration, type SceneGraph, type Scene } from "./scenes";

const scene = (kind: Scene["kind"], duration = 3): Scene => ({ id: kind, kind, title: "Un titre", duration, transition: "fade" });
const graph = (scenes: Scene[]): SceneGraph => ({ schema: 1, energy: "balanced", logoEmphasis: false, bpm: 120, musicTrackId: null, scenes });

test("timing remains exact with short openings, minimum scene durations and balanced rounding", () => {
  for (const duration of [10, 15, 30]) {
    const scenes = [scene("intro", 20), scene("logo", 10), ...Array.from({ length: 5 }, () => scene("feature", 1))];
    const times = generationDurations(scenes, duration);
    assert.equal(times.reduce((sum, value) => sum + value, 0), duration);
    assert.ok(times.every((value) => value >= 1 && Number.isInteger(value * 2)));
    assert.ok(times[0] <= 1.5 && times[1] <= 1.5);
  }
});

test("first video uses real captures, excludes unavailable media and snapshots the original brand", () => {
  const ctx = { duration: 15, screenUrls: ["a", "b", "c", "d"], logoUrl: null, styleId: "studio", colors: ["#123456"] };
  const source = graph([scene("logo"), { ...scene("screens"), screens: ["invented"] }, scene("screens"), scene("cta")]);
  const result = prepareFirstVideo(source, ctx);
  assert.equal(totalDuration(result), 15);
  assert.equal(result.styleId, "studio");
  assert.deepEqual(result.colors, ctx.colors);
  assert.equal(result.scenes[0].kind, "feature");
  assert.deepEqual(result.scenes[1].screens, ["a", "b", "c"]);
  assert.deepEqual(result.scenes[2].screens, ["d", "a", "b"]);
  const withoutMedia = prepareFirstVideo(source, { ...ctx, screenUrls: [] });
  assert.ok(withoutMedia.scenes.every((s) => s.kind !== "screens" && s.kind !== "logo"));
  assert.equal(source.scenes[0].kind, "logo");
});

test("overlong scene lists still fit a ten-second video and preserve the final CTA", () => {
  const result = prepareFirstVideo(graph([...Array.from({ length: 11 }, () => scene("feature")), scene("cta")]), { duration: 10, screenUrls: [], logoUrl: null, styleId: null, colors: [] });
  assert.equal(totalDuration(result), 10);
  assert.equal(result.scenes.at(-1)?.kind, "cta");
});
