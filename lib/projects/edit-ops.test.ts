import assert from "node:assert/strict";
import test from "node:test";
import type { SceneGraph } from "./scenes";
import { addScene, EditOpError, finalizeGraph, moveScene, removeLayer, removeScene, sceneForModel, setLayers, setOverlays, updateLayer, updateScene, updateVideo, type EditEnv } from "./edit-ops";

const screen = "/api/uploads/u/screen.png";
const env: EditEnv = { screenUrls: [screen], hasLogo: false, transitions: ["fade", "slide"], stage: false };
const graph: SceneGraph = {
  schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, logoLayout: "orbit",
  overlays: [{ id: "tag", type: "text", screen: null, text: "Beta", x: 0.9, y: 0.1, width: 0.1, opacity: 1, rotation: 0, fontSize: 0.03, color: null, background: null, animation: "none", sceneIds: ["shots"], start: null, end: null }],
  scenes: [
    { id: "intro", kind: "intro", title: "Hello", duration: 2, transition: "fade" },
    { id: "shots", kind: "screens", title: "Look", duration: 4, transition: "fade" },
    { id: "cta", kind: "cta", title: "Try it", duration: 2, transition: "fade" },
  ],
};

test("any scene field can be changed, null returns to the template", () => {
  const next = updateScene(graph, "intro", { subtitle: "Sub", textColors: { title: "#FF0000" }, textScales: { title: 1.5 }, textEnds: { title: 0.5 }, energy: "high", hideTemplate: true }, env);
  const intro = next.scenes[0];
  assert.equal(intro.subtitle, "Sub");
  assert.deepEqual(intro.textColors, { title: "#ff0000" });
  assert.deepEqual(intro.textScales, { title: 1.5 });
  assert.deepEqual(intro.textEnds, { title: 0.5 });
  assert.equal(intro.energy, "high");
  assert.equal(intro.hideTemplate, true);
  const reset = updateScene(next, "intro", { subtitle: null, textColors: null, energy: null, hideTemplate: false }, env).scenes[0];
  assert.equal(reset.subtitle, undefined);
  assert.equal(reset.textColors, undefined);
  assert.equal(reset.energy, undefined);
  assert.equal(reset.hideTemplate, undefined);
  // Le plan d'origine n'est jamais modifié
  assert.equal(graph.scenes[0].subtitle, undefined);
});

test("invalid values are refused with a message for the model", () => {
  assert.throws(() => updateScene(graph, "intro", { transition: "cube" }, env), EditOpError);
  assert.throws(() => updateScene(graph, "intro", { layout: "fan" }, env), /screens/);
  assert.throws(() => updateScene(graph, "nope", { title: "x" }, env), /introuvable/);
  assert.throws(() => updateScene(graph, "shots", { screens: [3] }, env), /Capture 3/);
  assert.throws(() => updateScene(graph, "intro", { presentation: "punch" }, env), /impossible/);
  const long = { ...graph, scenes: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, kind: "feature" as const, title: "x", duration: 18, transition: "fade" as const })) };
  assert.throws(() => updateScene(long, "s0", { duration: 20 }, env), /90/, "durée totale bornée");
});

test("screens scenes take captures and framing steps by number", () => {
  const next = updateScene(graph, "shots", { screens: [0], focuses: [{ screen: 0, x: 0.1, y: 0.1, w: 0.3, h: 0.2, mode: "zoom", title: "Step" }] }, env);
  assert.deepEqual(next.scenes[1].screens, [screen]);
  assert.equal(next.scenes[1].focuses?.[0].src, screen);
  assert.equal(sceneForModel(next.scenes[1], [screen]).focuses?.[0].screen, 0);
});

test("headlines keep their titles split", () => {
  const next = updateScene(graph, "intro", { kind: "headlines", title: "One | Two | Three" }, env).scenes[0];
  assert.equal(next.title, "One");
  assert.deepEqual(next.lines, ["Two", "Three"]);
  assert.equal(sceneForModel(next, []).title, "One | Two | Three");
});

test("scenes are added, moved and removed", () => {
  const { graph: added, id } = addScene(graph, "feature", "intro", { title: "New" }, env, "custom-1");
  assert.equal(id, "custom-1");
  assert.deepEqual(added.scenes.map((s) => s.id), ["intro", "custom-1", "shots", "cta"]);
  assert.throws(() => addScene(graph, "feature", null, {}, env, "custom-2"), /titre/);
  assert.deepEqual(moveScene(added, "cta", 0, env).scenes.map((s) => s.id), ["cta", "intro", "custom-1", "shots"]);
  const removed = removeScene(graph, "shots", env);
  assert.deepEqual(removed.scenes.map((s) => s.id), ["intro", "cta"]);
  assert.deepEqual(removed.overlays, []);
  assert.throws(() => removeScene(removed, "cta", env), /au moins/);
});

test("video settings, music and brand are validated", () => {
  const next = updateVideo(graph, { energy: "high", logoLayout: null, colors: ["#ABCDEF", "nope"], fonts: "template", audio: { volume: 4 } }, env);
  assert.equal(next.energy, "high");
  assert.equal(next.logoLayout, undefined);
  assert.deepEqual(next.colors, ["#abcdef"]);
  assert.equal(next.audio?.volume, 1);
  assert.throws(() => updateVideo(graph, { musicTrackId: "missing" }, env), /introuvable/);
});

test("a scoped edit only touches its scene", () => {
  const scoped = { ...env, scopeSceneId: "intro" };
  assert.equal(updateScene(graph, "intro", { title: "Yo" }, scoped).scenes[0].title, "Yo");
  assert.throws(() => updateScene(graph, "cta", { title: "Yo" }, scoped), /ciblée/);
  assert.throws(() => updateVideo(graph, { energy: "high" }, scoped), /ciblée/);
  assert.throws(() => addScene(graph, "feature", null, { title: "x" }, scoped, "c"), /ciblée/);
  assert.throws(() => setOverlays(graph, [], scoped), /ciblée/);
});

test("scene layers are set, patched and removed", () => {
  const withLayers = setLayers(graph, "intro", [
    { id: "bg", type: "rect", w: 1, h: 1, color: "#101010" },
    { id: "big", type: "text", text: "WOW", keyframes: [{ t: 0, scale: 3 }, { t: 0.5, scale: 1, ease: "out" }] },
  ], env, true);
  const intro = withLayers.scenes[0];
  assert.equal(intro.layers?.length, 2);
  assert.equal(intro.hideTemplate, true);
  const patched = updateLayer(withLayers, "intro", "big", { color: "#ffcc00" }, env).scenes[0].layers![1];
  assert.equal(patched.base.color, "#ffcc00");
  assert.equal(patched.keyframes.length, 2, "les images clés non fournies sont conservées");
  assert.equal(removeLayer(withLayers, "intro", "bg", env).scenes[0].layers?.length, 1);
  assert.throws(() => setLayers(graph, "intro", [{ id: "a", type: "rect" }, { id: "a", type: "ellipse" }], env), /Deux calques/);
  assert.throws(() => updateLayer(withLayers, "intro", "ghost", {}, env), /introuvable/);
  assert.equal(setLayers(withLayers, "intro", [], env).scenes[0].layers, undefined);
});

test("finalize keeps template transitions and bounded durations", () => {
  const raw = { ...graph, scenes: graph.scenes.map((s, i) => i === 1 ? { ...s, transition: "cube" as const, duration: 0.2 } : s) };
  const next = finalizeGraph(raw, env);
  assert.equal(next.scenes[1].transition, "slide");
  assert.equal(next.scenes[1].duration, 1);
});

test("3D camera, pose and device settings follow the template family", () => {
  const stage = { ...env, stage: true };
  const next = updateScene(graph, "intro", { camera: { start: { angle: 90 } }, pose: { spins: 1 } }, stage).scenes[0];
  assert.deepEqual(next.camera, { start: { angle: 65 } });
  assert.deepEqual(next.pose, { spins: 1 });
  assert.equal(updateScene({ ...graph, scenes: [next, ...graph.scenes.slice(1)] }, "intro", { camera: null, pose: null }, stage).scenes[0].camera, undefined);
  assert.deepEqual(updateScene(graph, "intro", { pose: { turn: 60, spins: 2 } }, { ...env, product3d: true }).scenes[0].pose, { turn: 20 });
  assert.throws(() => updateScene(graph, "intro", { camera: { frameX: 0.3 } }, env), /3D/);
  assert.equal(updateVideo(graph, { deviceMockup: "macbook-pro", deviceColor: "#1E40AF" }, stage).deviceColor, "#1e40af");
  assert.equal(updateVideo(graph, { deviceMockup: "macbook-pro" }, env).deviceMockup, "macbook-pro");
  assert.throws(() => updateVideo(graph, { deviceColor: "#000000" }, env), /Stage/);
});
