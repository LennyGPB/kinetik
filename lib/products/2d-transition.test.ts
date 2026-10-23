import test from "node:test";
import assert from "node:assert/strict";
import { product2DTransition } from "../../config/product-2d-transition";

const styles = ["product-studio", "product-floating", "product-editorial"];
test("2.5D photo stages cross fractional scene boundaries without position, scale or blur jumps", () => {
  const durations = [2.37, 1.83, 3.11, 2.69];
  for (const style of styles) for (const fps of [24, 30, 60]) {
    for (const boundary of [durations[0], durations[0] + durations[1], durations.slice(0, 3).reduce((a, b) => a + b, 0)]) {
      const frame = Math.round(boundary * fps);
      const before = product2DTransition(style, durations, frame - .001, fps);
      const after = product2DTransition(style, durations, frame, fps);
      assert.ok(before.screen.a !== before.screen.b);
      assert.ok(after.screen.mix > 0 && after.screen.mix < 1);
      for (const key of ["x", "y", "scale", "roll", "blur"] as const) {
        assert.ok(Math.abs(before.photo[key] - after.photo[key]) < .03, `${style} ${key}`);
      }
      assert.deepEqual(product2DTransition(style, durations, frame, fps), after);
    }
  }
});

test("the three transition signatures preserve bounded visible product framing and finish cleanly", () => {
  for (const style of styles) for (const durations of [[3.75, 3.75, 3.75, 3.75], [.4, .6, .5]]) {
    const total = Math.round(durations.reduce((a, b) => a + b, 0) * 30);
    for (let frame = 0; frame < total; frame++) {
      const state = product2DTransition(style, durations, frame, 30);
      assert.ok(state.photo.scale >= .88 && state.photo.scale <= 1.3);
      assert.ok(Math.abs(state.photo.x) < 70 && Math.abs(state.photo.y) <= 34);
      assert.ok(state.photo.blur >= 0 && state.photo.blur <= 1.4);
      assert.ok(Object.values(state.photo).every(Number.isFinite));
      if (state.screen.a === state.screen.b) assert.equal(state.photo.blur, 0);
    }
    assert.equal(product2DTransition(style, durations, total - 1, 30).photo.blur, 0);
  }
  const middle = styles.map(style => product2DTransition(style, [4, 4], 120, 30));
  assert.notDeepEqual(middle[0].photo, middle[1].photo);
  assert.notEqual(middle[0].decorShift, middle[2].decorShift);
});
