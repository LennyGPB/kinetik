import assert from "node:assert/strict";
import test from "node:test";
import { applyPinnedLogoRequest } from "./logo-overlay-request";
import type { SceneGraph } from "./scenes";
const graph: SceneGraph = { schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [
  { id: "intro-a", kind: "intro", title: "Hello", duration: 3, transition: "fade" },
  { id: "cta-b", kind: "cta", title: "Try", duration: 3, transition: "fade" },
] };
const message = "c'est possible de rajouter, sur toute les scènes, le logo en petit en haut à droite";
test("the exact reported request creates a global logo without changing the montage", () => {
  const result = applyPinnedLogoRequest(graph, message, true);
  assert.ok(result?.graph);
  assert.deepEqual(result.graph.overlays?.map(({ type, x, y, width, sceneIds }) => ({ type, x, y, width, sceneIds })), [{ type: "logo", x: 0.9, y: 0.08, width: 0.1, sceneIds: null }]);
  assert.strictEqual(result.graph.scenes, graph.scenes);
  assert.equal(result.graph.energy, graph.energy);
});
test("an explicit global command overrides a selected scene, other commands stay local", () => {
  assert.equal(applyPinnedLogoRequest(graph, message, true, "intro-a")?.graph?.overlays?.[0].sceneIds, null);
  assert.deepEqual(applyPinnedLogoRequest(graph, "mets le logo en petit en haut à droite", true, "intro-a")?.graph?.overlays?.[0].sceneIds, ["intro-a"]);
});
test("a missing logo produces a truthful reply without a proposed graph", () => {
  assert.equal(applyPinnedLogoRequest(graph, message, false)?.graph, null);
});
test("repeat requests reuse the layer, compound or negative requests go to the AI", () => {
  const once = applyPinnedLogoRequest(graph, message, true)!.graph!;
  assert.equal(applyPinnedLogoRequest(once, message, true)?.graph?.overlays?.length, 1);
  for (const request of ["ne mets pas le logo en petit en haut à droite", "mets le logo en petit en haut à droite et raccourcis la vidéo", "mets un grand logo au centre", "retire le petit logo en haut à droite"]) assert.equal(applyPinnedLogoRequest(graph, request, true), null);
});
