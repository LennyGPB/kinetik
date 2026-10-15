import assert from "node:assert/strict";
import test from "node:test";
import type { SceneGraph, ScreenFocus } from "./scenes";
import { applyTimelineEdit, isTimelineEdit } from "./timeline";
import { sceneFocuses } from "./scenes";
import { applyTranslation, translationEntries } from "./translation";

const focus: ScreenFocus = { src: "/api/uploads/screen.png", x: 0.8, y: 0.8, w: 0.4, h: 0.3, mode: "popout" };
const graph: SceneGraph = {
  schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120,
  scenes: [{ id: "screen-a", kind: "screens", title: "Detail", duration: 3, transition: "fade" }],
};

test("cutout animations validate and survive coordinate clamping and text edits", () => {
  for (const animation of [undefined, "lift", "pivot"] as const) {
    const edit = { kind: "focus", sceneId: "screen-a", focus: { ...focus, animation } } as const;
    assert.ok(isTimelineEdit(edit));
    const next = applyTimelineEdit(graph, edit);
    assert.equal(next.scenes[0].focus?.animation, animation);
    assert.equal(next.scenes[0].focus?.x, 0.6);
    assert.equal(next.scenes[0].focus?.y, 0.7);
    const renamed = applyTimelineEdit(next, { kind: "text", sceneId: "screen-a", title: "New title", subtitle: null });
    assert.deepEqual(renamed.scenes[0].focus, next.scenes[0].focus);
  }
  assert.equal(isTimelineEdit({ kind: "focus", sceneId: "screen-a", focus: { ...focus, animation: "invalid" } }), false);
});

test("zoom drops cutout-specific animation and cutout removal clears the choice", () => {
  const next = applyTimelineEdit(graph, { kind: "focus", sceneId: "screen-a", focus: { ...focus, mode: "zoom", animation: "pivot" } });
  assert.equal(next.scenes[0].focus?.animation, undefined);
  const removed = applyTimelineEdit(next, { kind: "focus", sceneId: "screen-a", focus: null });
  assert.equal(removed.scenes[0].focus, undefined);
});

test("ordered mixed framing steps persist, duplicate independently and supersede legacy focus", () => {
  const focuses: ScreenFocus[] = [{ ...focus, mode: "zoom" }, { ...focus, animation: "pivot", label: "Detail" }];
  const edit = { kind: "focuses", sceneId: "screen-a", focuses } as const;
  assert.ok(isTimelineEdit(edit));
  assert.equal(isTimelineEdit({ ...edit, focuses: Array(7).fill(focus) }), false);
  assert.equal(isTimelineEdit({ ...edit, focuses: [{ ...focus, x: NaN }] }), false);
  const legacy = applyTimelineEdit(graph, { kind: "focus", sceneId: "screen-a", focus });
  assert.equal(sceneFocuses(legacy.scenes[0]).length, 1);
  const next = applyTimelineEdit(legacy, edit);
  assert.equal(next.scenes[0].focus, undefined);
  assert.deepEqual(sceneFocuses(next.scenes[0]).map((f) => f.mode), ["zoom", "popout"]);
  assert.equal(next.scenes[0].focuses?.[1].animation, "pivot");
  const copy = applyTimelineEdit(next, { kind: "duplicate", sceneId: "screen-a", id: "screens-copy123" });
  assert.deepEqual(copy.scenes[1].focuses, copy.scenes[0].focuses);
  assert.notStrictEqual(copy.scenes[1].focuses, copy.scenes[0].focuses);
  const cleared = applyTimelineEdit(next, { kind: "focuses", sceneId: "screen-a", focuses: [] });
  assert.deepEqual(sceneFocuses(cleared.scenes[0]), []);
  const replaced = applyTimelineEdit(next, { kind: "focus", sceneId: "screen-a", focus });
  assert.equal(replaced.scenes[0].focuses, undefined);
});

test("all framing labels translate without changing their order, crops or animation", () => {
  const next = applyTimelineEdit(graph, { kind: "focuses", sceneId: "screen-a", focuses: [{ ...focus, label: "First" }, { ...focus, label: "Second", animation: "pivot" }] });
  const entries = translationEntries(next);
  const translated = applyTranslation(next, entries.map((entry) => ({ key: entry.key, text: `${entry.text} FR` })), "fr");
  assert.deepEqual(translated.scenes[0].focuses?.map((f) => f.label), ["First FR", "Second FR"]);
  assert.equal(translated.scenes[0].focuses?.[1].animation, "pivot");
  assert.equal(translated.scenes[0].focuses?.[1].x, next.scenes[0].focuses?.[1].x);
});

test("each framing step keeps its own text, trimmed, for zooms and cutouts, and translates", () => {
  const focuses: ScreenFocus[] = [{ ...focus, mode: "zoom", title: "  Zoom text  " }, { ...focus }, { ...focus, title: "Cutout text" }];
  const edit = { kind: "focuses", sceneId: "screen-a", focuses } as const;
  assert.ok(isTimelineEdit(edit));
  assert.equal(isTimelineEdit({ ...edit, focuses: [{ ...focus, title: "x".repeat(81) }] }), false);
  const next = applyTimelineEdit(graph, edit);
  assert.deepEqual(next.scenes[0].focuses?.map((f) => f.title), ["Zoom text", undefined, "Cutout text"]);
  const translated = applyTranslation(next, translationEntries(next).map((entry) => ({ key: entry.key, text: `${entry.text} FR` })), "fr");
  assert.equal(translated.scenes[0].title, "Detail FR");
  assert.deepEqual(translated.scenes[0].focuses?.map((f) => f.title), ["Zoom text FR", undefined, "Cutout text FR"]);
});
