import assert from "node:assert/strict";
import test from "node:test";
import type { ScreenFocus } from "../../lib/projects/scenes";
import { framingTransition } from "./focus-transition";

const first: ScreenFocus = { src: "/api/uploads/screen.png", mode: "zoom", x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
const second: ScreenFocus = { ...first, x: 0.6, y: 0.5, w: 0.3, h: 0.2 };

test("successive zooms move directly between crops without a full-screen intermediate", () => {
  assert.deepEqual(framingTransition(first, second, 0, 60).focus, first);
  const middle = framingTransition(first, second, 6, 60);
  assert.ok(middle.morph);
  assert.equal(middle.focus.x, 0.35);
  assert.equal(middle.focus.w, 0.25);
  assert.deepEqual(framingTransition(first, second, 12, 60).focus, second);
  assert.deepEqual(framingTransition(first, second, 59, 60).focus, second);
});

test("mixed modes and different screenshots crossfade their focused states", () => {
  for (const next of [{ ...second, mode: "popout" as const }, { ...second, src: "/api/uploads/other.png" }]) {
    assert.equal(framingTransition(first, next, 0, 60).morph, false);
    assert.equal(framingTransition(first, next, 0, 60).progress, 0);
    assert.equal(framingTransition(first, next, 12, 60).progress, 1);
  }
  assert.deepEqual(framingTransition(undefined, first, 0, 60).focus, first);
});
