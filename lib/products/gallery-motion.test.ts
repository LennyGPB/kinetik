import test from "node:test";
import assert from "node:assert/strict";
import { productGalleryMotion, productGalleryTextOpacity } from "../../config/product-gallery-motion";

test("camera and photo blending stay continuous at fractional scene boundaries", () => {
  const durations = [3.75, 3.75, 3.75, 3.75], fps = 30;
  for (const [index, boundary] of [[1, 113], [2, 225], [3, 338]]) {
    const before = productGalleryMotion(durations, boundary - 1, fps), after = productGalleryMotion(durations, boundary, fps);
    assert.equal(before.index, index - 1); assert.equal(after.index, index);
    assert.equal(before.screen.a, after.screen.a); assert.equal(before.screen.b, after.screen.b);
    assert.ok(after.screen.mix >= before.screen.mix && after.screen.mix - before.screen.mix < .1);
    assert.ok(Math.abs(after.camera.az - before.camera.az) < .2);
    assert.ok(Math.abs(after.camera.distance - before.camera.distance) < .5);
    assert.ok(Math.abs(after.camera.height - before.camera.height) < .35);
    const edge = productGalleryMotion(durations, boundary - .001, fps);
    for (const key of ["az", "distance", "height"] as const) assert.ok(Math.abs(after.camera[key] - edge.camera[key]) < .001, `continuous ${key} at scene boundary`);
    assert.equal(after.total, 450);
  }
  for (const frame of [55, 168, 280, 393]) {
    const state = productGalleryMotion(durations, frame, fps);
    assert.equal(state.transitionStrength, 0);
    assert.equal(state.screen.a, state.screen.b);
  }
});

test("camera moves directly to each next shot without reversing any axis", () => {
  const durations = [3.75, 3.75, 3.75, 3.75];
  for (const boundary of [113, 225, 338]) {
    const states = Array.from({length: 29}, (_, index) => productGalleryMotion(durations, boundary - 11 + index, 30));
    for (const key of ["az", "distance", "height"] as const) {
      const direction = Math.sign(states.at(-1)!.camera[key] - states[0].camera[key]);
      for (let index = 1; index < states.length; index++) {
        assert.ok((states[index].camera[key] - states[index - 1].camera[key]) * direction >= -1e-8, `${key} does not reverse at ${boundary}`);
      }
    }
    assert.ok(Math.abs(states.at(-1)!.camera.az - states[0].camera.az) > .4);
  }
});
test("short scenes and seeking keep valid visible photographs and finite camera poses", () => {
  const durations = [.4, .6, .5];
  for (let frame = 0; frame < 45; frame++) {
    const state = productGalleryMotion(durations, frame, 30);
    assert.ok(state.transitionStrength >= 0 && state.transitionStrength <= 1);
    assert.ok(state.screen.mix >= 0 && state.screen.mix <= 1);
    assert.ok(state.screen.a >= 0 && state.screen.b < durations.length);
    assert.ok(Object.values(state.camera).every(Number.isFinite));
    assert.deepEqual(productGalleryMotion(durations, frame, 30), state);
  }
  assert.equal(productGalleryMotion(durations, 44, 30).transitionStrength, 0);
  assert.equal(productGalleryMotion([], 0, 30).transitionStrength, 0);
  assert.equal(productGalleryTextOpacity(0), 1);
  assert.equal(productGalleryTextOpacity(.65), 0);
  assert.equal(productGalleryTextOpacity(1), 0);
});

