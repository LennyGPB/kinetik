import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOGO_MOTIONS, logoMotionState } from "../../config/logo-motion";
import { LogoMotionSchema, logoMotionGraph, type LogoMotionInput } from "./logo-motion";
import { applyQuickSetting } from "./settings";
import { LogoWordArt } from "../../remotion/video/logo-word";
import { SIGNATURE_COLLECTION } from "../../config/logo-motion-collection";
import { getRecipe } from "../../config/recipes";
import { getStyle } from "../../config/styles";

const input: LogoMotionInput = { requestId: "00000000-0000-4000-8000-000000000001", text: "  Mon studio.  ", templateId: "logo-slice", colors: ["#fafaf7", "#111111", "#111111"], format: "SQUARE", duration: 6, musicTrackId: null, locale: "fr" };

test("Logo motion preserves exact copy and validates supported creation settings", () => {
  const parsed = LogoMotionSchema.parse(input);
  const graph = logoMotionGraph(parsed);
  assert.equal(graph.scenes.length, 1);
  assert.equal(graph.scenes[0].title, "Mon studio.");
  assert.equal(graph.scenes[0].duration, 6);
  for (const patch of [{ text: " " }, { text: "a".repeat(49) }, { duration: 5 }, { templateId: "unknown" }, { musicTrackId: "unknown" }, { colors: ["red", "blue", "white"] }]) {
    assert.equal(LogoMotionSchema.safeParse({ ...input, ...patch }).success, false);
  }
});

test("Changing animation preserves editable copy, timing and colors", () => {
  const graph = logoMotionGraph(input);
  const next = applyQuickSetting(graph, { kind: "logoMotion", value: "logo-liquid" }, "logo-word");
  assert.equal(next.styleId, "logo-liquid");
  assert.deepEqual(next.scenes, graph.scenes);
  assert.deepEqual(next.colors, graph.colors);
  assert.equal(graph.styleId, "logo-slice");
});

test("All presets render actual vector letters outside a Remotion player and escape input", () => {
  for (const preset of LOGO_MOTIONS) {
    const html = renderToStaticMarkup(createElement(LogoWordArt, { template: preset.id, text: '<script>Studio</script>', colors: [...preset.palette], time: 1.5 }));
    assert.ok(html.includes("<path") && html.includes("<svg"));
    assert.ok(!html.includes("<script>"));
  }
  assert.notEqual(logoMotionState(.9, 6).distort, logoMotionState(2.5, 6).distort);
});

test("The 15 new signatures are selectable, editable and have animated export recipes", () => {
  assert.equal(SIGNATURE_COLLECTION.length, 15);
  assert.equal(new Set(LOGO_MOTIONS.map(item => item.id)).size, LOGO_MOTIONS.length);
  for (const item of SIGNATURE_COLLECTION) {
    assert.equal(getStyle(item.id)?.recipe.logoMotion, item.id);
    assert.equal(getRecipe(item.id).logoMotion, item.id);
    for (const format of ["SQUARE", "PORTRAIT", "LANDSCAPE"] as const) {
      const parsed = LogoMotionSchema.parse({ ...input, templateId: item.id, format });
      assert.equal(logoMotionGraph(parsed).styleId, item.id);
    }
    const frames = [0, .4, 1.5, 3.6, 5.9].map(time => renderToStaticMarkup(createElement(LogoWordArt, {
      template: item.id, text: "Élan & Studio / une signature qui reste en mémoire", colors: [...item.palette], time, duration: 6,
    })));
    for (const frame of frames) assert.ok(!/NaN|Infinity|undefined/.test(frame), item.name);
    assert.notEqual(frames[1], frames[2], `${item.name} has an entrance`);
    assert.notEqual(frames[2], frames[3], `${item.name} has a second motion beat`);
  }
});
