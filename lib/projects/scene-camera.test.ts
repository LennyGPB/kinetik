import assert from "node:assert/strict";
import test from "node:test";
import { compatibleTransitions } from "../../config/transition-compat";
import { productSignatureMotion, productViewOffset } from "../../config/product-signature-motion";
import { getRecipe } from "../../config/recipes";
import { sceneShot, stageState, STAGE_TRANSITIONS, type StageScene } from "../../config/stage-motion";
import { cameraShotAt, normalizeCamera, normalizePose, poseAt } from "./scene-camera";

const scene = (over: Partial<StageScene> = {}): StageScene => ({ kind: "feature", transition: "fade", from: 0, duration: 90, deviceCount: 1, showDevice: true, ...over });

test("camera and pose values are bounded; flat product photos keep small rotations", () => {
  assert.deepEqual(normalizeCamera({ start: { angle: 120, height: -50, zoom: 9 }, frameX: 2 }), { start: { angle: 65, height: -20, zoom: 2.5 }, frameX: 0.9 });
  assert.equal(normalizeCamera({}), undefined);
  assert.deepEqual(normalizePose({ turn: 90, spins: 2 }, true), { turn: 20 });
  assert.deepEqual(normalizePose({ turn: 90, spins: 2 }), { turn: 90, spins: 2 });
});

test("a held shot without end keeps the start values", () => {
  assert.deepEqual(cameraShotAt({ start: { angle: 10 } }, 0.7), { angle: 10, height: undefined, zoom: undefined });
  const moving = cameraShotAt({ start: { angle: 0 }, end: { angle: 40 } }, 0.5);
  assert.equal(moving.angle, 20);
});

test("spins end exactly on the starting orientation", () => {
  assert.ok(Math.abs(poseAt({ spins: 2 }, 1, 0).turn) < 1e-9);
  assert.ok(Math.abs(poseAt({ spins: 1 }, 0.5, 0).turn - Math.PI) < 1e-9);
});

test("Stage applies the requested shot and framing on top of the template", () => {
  const base = sceneShot(scene(), 0, 0.5, "landscape");
  const custom = sceneShot(scene({ camera: { start: { angle: 30, height: 50, zoom: 2 }, frameX: 0.4 } }), 0, 0.5, "landscape");
  assert.equal(custom.az, 30);
  assert.equal(custom.el, 50);
  assert.ok(Math.abs(custom.dist - base.dist / 2) < 1e-9);
  assert.equal(custom.x, 0.4);
  assert.equal(custom.ty, base.ty);
});

test("Stage gesture can be removed and the device pose blends between scenes", () => {
  const scenes = [scene({ duration: 60 }), scene({ from: 60, duration: 60, pose: { turn: 90 }, camera: { gesture: "none" } })];
  const mid = stageState(scenes, 58, "landscape");
  assert.equal(mid.lens.gesture, null);
  assert.ok(mid.pose.turn > 0 && mid.pose.turn < Math.PI / 2);
  assert.ok(Math.abs(stageState(scenes, 100, "landscape").pose.turn - Math.PI / 2) < 1e-9);
  assert.equal(stageState([scene()], 30, "landscape").pose.turn, 0);
});

test("product 3D templates take the requested angle, zoom, gesture and framing", () => {
  const base = productSignatureMotion("splash", [3, 3], 30, 30);
  const custom = productSignatureMotion("splash", [3, 3], 30, 30, 120, [{ camera: { start: { angle: 0, zoom: 2 }, frameX: 0.5 }, pose: { scale: 1.2 } }]);
  assert.equal(custom.camera.az, 0);
  assert.ok(Math.abs(custom.camera.distance - base.camera.distance / 2) < 1e-9);
  assert.equal(custom.pose.scale, 1.2);
  assert.deepEqual(productViewOffset(custom, 1920, 1080).map((v) => Math.round(v)), [0, 27]);
  assert.deepEqual(productViewOffset(base, 1920, 1080).map((v) => Math.round(v)), [Math.round(-0.22 * 1920), Math.round(0.025 * 1080)]);
  const still = productSignatureMotion("splash", [3, 3], 87, 30, 120, [{}, { camera: { gesture: "none" } }]);
  assert.equal(still.gesture, null);
});

test("compatible transitions: all generic ones in 2D, camera-only ones on Stage, the template's on products", () => {
  const flat = compatibleTransitions(null);
  assert.ok(flat.includes("ink") && flat.includes("cube"));
  assert.ok(!flat.some((t) => (STAGE_TRANSITIONS as readonly string[]).includes(t)));
  const stage = compatibleTransitions("stage");
  assert.ok(stage.includes("turntable") && stage.includes("vault-pass") && stage.includes("cut"));
  assert.ok(!stage.includes("district") && !stage.includes("ink"));
  assert.deepEqual(compatibleTransitions("product-gallery-3d"), getRecipe("product-gallery-3d").transitions);
});
