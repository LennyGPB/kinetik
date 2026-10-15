import assert from "node:assert/strict";
import test from "node:test";
import { applyQuickSetting } from "./settings";
import { sceneSettings } from "./scene-settings";
import type { SceneGraph } from "./scenes";
import { applyTimelineEdit } from "./timeline";

const graph: SceneGraph = {
  schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120,
  titleAnimation: "fade", logoBackground: true,
  scenes: [
    { id: "one", kind: "screens", title: "One", duration: 4, transition: "fade" },
    { id: "two", kind: "screens", title: "Two", duration: 4, transition: "fade" },
    { id: "logo", kind: "logo", title: "App", duration: 4, transition: "fade" },
  ],
};

test("contextual mockup settings affect only the selected scene", () => {
  const next = applyQuickSetting(graph, { kind: "screensLayout", value: "hero" }, "two");
  assert.equal(next.scenes[1].layout, "hero");
  assert.deepEqual(next.scenes[0], graph.scenes[0]);
  assert.deepEqual(next.scenes[2], graph.scenes[2]);
  assert.equal(graph.scenes[1].layout, undefined);
});

test("local animation and logo settings preserve global settings and reset to inherited values", () => {
  const animated = applyQuickSetting(graph, { kind: "titleAnimation", value: "words" }, "one");
  assert.equal(sceneSettings(animated, animated.scenes[0]).titleAnimation, "words");
  assert.equal(sceneSettings(animated, animated.scenes[1]).titleAnimation, "fade");
  const reset = applyQuickSetting(animated, { kind: "titleAnimation", value: null }, "one");
  assert.equal(sceneSettings(reset, reset.scenes[0]).titleAnimation, "fade");
  const logo = applyQuickSetting(graph, { kind: "logoBackground", value: false }, "logo");
  assert.equal(logo.logoBackground, true);
  assert.equal(sceneSettings(logo, logo.scenes[2]).logoBackground, false);
});

test("global mockup controls still affect every mockup scene", () => {
  const next = applyQuickSetting(graph, { kind: "screenCount", value: 2 });
  assert.equal(next.scenes[0].screenCount, 2);
  assert.equal(next.scenes[1].screenCount, 2);
  assert.equal(next.scenes[2].screenCount, undefined);
});

test("replacing a capture clears focus when its source is no longer selected", () => {
  const base = structuredClone(graph);
  base.scenes[0].focus = { src: "/api/uploads/old.png", mode: "zoom", x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
  const next = applyTimelineEdit(base, { kind: "screens", sceneId: "one", screens: ["/api/uploads/new.png"] });
  assert.equal(next.scenes[0].focus, undefined);
  assert.deepEqual(next.scenes[0].screens, ["/api/uploads/new.png"]);
  assert.ok(base.scenes[0].focus);
});
