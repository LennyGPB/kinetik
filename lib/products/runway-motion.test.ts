import test from "node:test";
import assert from "node:assert/strict";
import { productRunwayMotion, runwayStation } from "../../config/product-runway-motion";

test("runway camera travels through one fixed set without a jump or reversal", () => {
  const durations = [3.75, 3.75, 3.75, 3.75];
  let previous = productRunwayMotion(durations, 0, 30);
  for (let frame = 1; frame < 450; frame++) {
    const state = productRunwayMotion(durations, frame, 30);
    assert.ok(state.target.x >= previous.target.x);
    assert.ok(Math.abs(state.position.x - previous.position.x) < .8);
    assert.ok(Object.values(state.position).every(Number.isFinite));
    assert.deepEqual(productRunwayMotion(durations, frame, 30), state);
    previous = state;
  }
  for (const [frame, index] of [[55, 0], [168, 1], [280, 2], [393, 3]]) {
    const state = productRunwayMotion(durations, frame, 30);
    assert.equal(state.target.x, runwayStation(index).x);
    assert.equal(state.target.z, runwayStation(index).z);
  }
  for (const boundary of [113, 225, 338]) {
    const before = productRunwayMotion(durations, boundary - .001, 30), after = productRunwayMotion(durations, boundary, 30);
    for (const key of ["x", "y", "z"] as const) assert.ok(Math.abs(before.position[key] - after.position[key]) < .001);
  }
});

test("runway holds retain Stage-like crane and orbit movement while the product station stays fixed", () => {
  const durations = [3.75, 3.75, 3.75, 3.75];
  for (const [start, end] of [[30, 85], [140, 195], [255, 310], [370, 425]]) {
    const a = productRunwayMotion(durations, start, 30), b = productRunwayMotion(durations, end, 30);
    assert.deepEqual(a.target, b.target);
    assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z) > .1);
  }
});
