import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOverlays, overlayApplies, type VideoOverlay } from "./overlays";
import { mergeSceneEdit } from "./scene-edit";
import { signProposal, verifyProposal, type ProposalPayload } from "./edit-proposal";
import type { SceneGraph } from "./scenes";

const logo: VideoOverlay = { id: "pinned-logo", type: "logo", screen: null, text: null, x: 0.9, y: 0.08, width: 0.1, opacity: 1, rotation: 0, fontSize: 0.035, color: null, background: null, animation: "none", sceneIds: null, start: null, end: null };
const graph: SceneGraph = { schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, overlays: [logo], scenes: [
  { id: "intro-a", kind: "intro", title: "Hello", duration: 3, transition: "fade" },
  { id: "cta-b", kind: "cta", title: "Try", duration: 3, transition: "fade" },
] };

test("global logo applies to every scene, local layers only to their targets", () => {
  assert.ok(overlayApplies(logo, "intro-a"));
  assert.ok(overlayApplies(logo, "cta-b"));
  assert.equal(overlayApplies({ ...logo, sceneIds: ["intro-a"] }, "cta-b"), false);
});
test("layers use only available project media and known scene ids", () => {
  assert.deepEqual(normalizeOverlays([logo], ["intro-a"], 0, false), []);
  assert.deepEqual(normalizeOverlays([{ ...logo, type: "image", screen: 4 }], ["intro-a"], 1, true), []);
  assert.deepEqual(normalizeOverlays([{ ...logo, sceneIds: ["unknown"] }], ["intro-a"], 1, true), []);
  assert.equal(normalizeOverlays([{ ...logo, type: "image", screen: 0 }], ["intro-a"], 1, true).length, 1);
});
test("layer positions, sizes, opacity and colours are bounded", () => {
  const [layer] = normalizeOverlays([{ ...logo, x: -2, y: 3, width: 30, opacity: 2, color: "url(https://external)", rotation: 900 }], ["intro-a"], 0, true);
  assert.equal(layer.x, 0.02); assert.equal(layer.y, 0.98); assert.equal(layer.width, 0.8); assert.equal(layer.opacity, 1); assert.equal(layer.color, null); assert.equal(layer.rotation, 180);
  assert.deepEqual(normalizeOverlays([{ ...logo, x: NaN }], ["intro-a"], 0, true), []);
});
test("invalid text, duplicate ids and excessive layers are handled", () => {
  assert.deepEqual(normalizeOverlays([{ ...logo, type: "text", text: " " }], ["intro-a"], 0, true), []);
  const result = normalizeOverlays(Array.from({ length: 20 }, () => logo), ["intro-a"], 0, true);
  assert.equal(result.length, 16); assert.equal(new Set(result.map((layer) => layer.id)).size, 16);
});
test("scoped logo repositioning preserves its original position on other scenes", () => {
  const edited = { ...graph, scenes: [graph.scenes[0]], overlays: [{ ...logo, x: 0.1, sceneIds: ["intro-a"] }] };
  const result = mergeSceneEdit(graph, edited, "intro-a");
  assert.equal(result.overlays?.find((layer) => overlayApplies(layer, "intro-a"))?.x, 0.1);
  assert.equal(result.overlays?.find((layer) => overlayApplies(layer, "cta-b"))?.x, 0.9);
  assert.strictEqual(result.scenes[1], graph.scenes[1]);
});
test("scoped removal doesn't remove logos from other scenes", () => {
  const result = mergeSceneEdit(graph, { ...graph, scenes: [graph.scenes[0]], overlays: [] }, "intro-a");
  assert.equal(result.overlays?.some((layer) => overlayApplies(layer, "intro-a")), false);
  assert.equal(result.overlays?.some((layer) => overlayApplies(layer, "cta-b")), true);
});
const proposal: ProposalPayload = { projectId: "project", baseVersionId: "base", messageId: "message", graph, label: "Logo superposé", expiresAt: 2000 };
test("proposal is authenticated, session-bound and expires", () => {
  const token = signProposal(proposal, "session-secret");
  assert.deepEqual(verifyProposal(token, "session-secret", 1000), proposal);
  assert.equal(verifyProposal(token, "other-session", 1000), null);
  assert.equal(verifyProposal(token, "session-secret", 2001), null);
  assert.equal(verifyProposal(token + ".extra", "session-secret", 1000), null);
  assert.equal(verifyProposal(signProposal({ ...proposal, label: "changed" }, "other-secret"), "session-secret", 1000), null);
});
