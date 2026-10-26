import test from "node:test";
import assert from "node:assert/strict";
import { runwayStation } from "../../config/product-runway-motion";
import { productSignatureMotion } from "../../config/product-signature-motion";

const durations = [3.75, 3.75, 3.75, 3.75];
const runway = (frame: number) => productSignatureMotion("runway", durations, frame, 30);

test("runway camera whips through one fixed set without reversing, and settles on every station", () => {
  let previous = runway(0);
  for (let frame = 1; frame < 450; frame++) {
    const state = runway(frame);
    assert.ok(state.target.x >= previous.target.x, `forward @${frame}`);
    assert.ok(Object.values(state.camera).every(Number.isFinite));
    assert.deepEqual(runway(frame), state);
    previous = state;
  }
  for (const [frame, index] of [[55, 0], [168, 1], [280, 2], [393, 3]]) {
    const state = runway(frame);
    assert.equal(state.target.x, runwayStation(index).x);
    assert.equal(state.target.z, runwayStation(index).z);
  }
  // Continu de part et d'autre de chaque frontière de scène
  for (const boundary of [113, 225, 338]) {
    const before = runway(boundary - 0.001), after = runway(boundary);
    for (const key of ["az", "distance", "height"] as const) assert.ok(Math.abs(before.camera[key] - after.camera[key]) < 0.001);
    assert.ok(Math.abs(before.target.x - after.target.x) < 0.001);
  }
});

test("the trip between stations is short: the product is away from the frame centre only briefly", () => {
  for (const boundary of [113, 225, 338]) {
    // Images pendant lesquelles la caméra vise à plus d'1 unité de toute station
    let away = 0;
    for (let frame = boundary - 15; frame < boundary + 20; frame++) {
      const { target } = runway(frame);
      const near = [0, 1, 2, 3].some((i) => Math.abs(target.x - runwayStation(i).x) < 1);
      if (!near) away++;
    }
    assert.ok(away <= 7, `away for ${away} frames at ${boundary}`);
  }
});

test("runway holds keep a crane / orbit while the product station stays fixed", () => {
  for (const [start, end] of [[30, 85], [140, 195], [255, 310], [370, 425]]) {
    const a = runway(start), b = runway(end);
    assert.deepEqual(a.target, b.target);
    assert.ok(Math.abs(a.camera.az - b.camera.az) + Math.abs(a.camera.distance - b.camera.distance) + Math.abs(a.camera.height - b.camera.height) > 0.1);
  }
});
