import assert from "node:assert/strict";
import test from "node:test";
import type { SceneGraph } from "../projects/scenes";
import { applyEditPatch, type ProjectContext } from "./ai";

const screen = "/api/uploads/u/screen.png";
const ctx: ProjectContext = { appName: "App", duration: 10, format: "LANDSCAPE", styleId: null, colors: [], musicTrackId: null, brief: null, websiteUrl: null, logoUrl: null, screenUrls: [screen], musicTempo: null };
const graph: SceneGraph = {
  schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, logoLayout: "orbit",
  scenes: [
    { id: "intro", kind: "intro", title: "Hello", duration: 2, transition: "fade" },
    { id: "shots", kind: "screens", title: "Look", duration: 4, transition: "fade", focuses: [{ src: screen, x: 0.1, y: 0.1, w: 0.3, h: 0.2, mode: "zoom", title: "Step text" }] },
    { id: "cta", kind: "cta", title: "Try it", duration: 2, transition: "fade" },
  ],
};
const empty = { relevant: true, reply: "", label: "", changedScenes: [], order: null, settings: null, overlays: null, brand: null };

test("an empty patch rebuilds the current plan and touches nothing", () => {
  const { output, touched } = applyEditPatch(graph, empty, ctx, false);
  assert.deepEqual(output.scenes.map((s) => s.id), ["intro", "shots", "cta"]);
  assert.equal(output.scenes[1].focuses?.[0].screen, 0);
  assert.equal(output.logoLayout, "orbit");
  assert.equal(touched.size, 0);
});

test("3D mockup capture overrides on intro and CTA are included in the AI editing context", () => {
  const source = { ...graph, styleId: "stage", scenes: graph.scenes.map((s) => s.kind === "screens" ? s : { ...s, screens: [screen] }) };
  const { output, touched } = applyEditPatch(source, empty, { ...ctx, styleId: "stage" }, false);
  assert.deepEqual(output.scenes[0].screens, [0]);
  assert.deepEqual(output.scenes[2].screens, [0]);
  assert.equal(touched.size, 0);
});

test("only changed scenes are replaced, new scenes go before the final call to action", () => {
  const intro = { id: "intro", presentation: null, kind: "intro" as const, title: "Bonjour", subtitle: null, duration: 2, transition: "fade" as const, layout: null, screenCount: null, screens: null, focus: null, focuses: null };
  const fresh = { ...intro, id: null, kind: "feature" as const, title: "New" };
  const { output, touched } = applyEditPatch(graph, { ...empty, changedScenes: [intro, fresh] }, ctx, false);
  assert.deepEqual(output.scenes.map((s) => s.title), ["Bonjour", "Look", "New", "Try it"]);
  assert.ok(touched.has("intro") && !touched.has("shots") && touched.size === 2);
});

test("order removes and reorders scenes, settings reset to the template and ignore invalid values", () => {
  const { output } = applyEditPatch(graph, { ...empty, order: ["cta", "intro", "missing", "intro"], settings: JSON.stringify({ logoLayout: null, energy: "high" }) }, ctx, false);
  assert.deepEqual(output.scenes.map((s) => s.id), ["cta", "intro"]);
  assert.equal(output.logoLayout, null);
  assert.equal(output.energy, "high");
  assert.throws(() => applyEditPatch(graph, { ...empty, settings: JSON.stringify({ energy: "wild" }) }, ctx, false));
});

test("a scoped edit never adds or reorders scenes", () => {
  const fresh = { id: null, presentation: null, kind: "feature" as const, title: "New", subtitle: null, duration: 2, transition: "fade" as const, layout: null, screenCount: null, screens: null, focus: null, focuses: null };
  const { output } = applyEditPatch(graph, { ...empty, changedScenes: [fresh], order: ["cta"] }, ctx, true);
  assert.deepEqual(output.scenes.map((s) => s.id), ["intro", "shots", "cta"]);
});
