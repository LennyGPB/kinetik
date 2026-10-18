import assert from "node:assert/strict";
import test from "node:test";
import { REFERENCE_MOTION, getReferenceMotion, referenceMotionTiming } from "../../config/reference-motion";
import { getStyle } from "../../config/styles";
import { getRecipe } from "../../config/recipes";
import { createProjectSchema } from "./validation";
import { getDictionary } from "../i18n";

test("four reference motions can be created in every format and have translated catalogue descriptions", () => {
  assert.equal(Object.keys(REFERENCE_MOTION).length, 4);
  for (const id of Object.keys(REFERENCE_MOTION)) for (const format of ["PORTRAIT", "SQUARE", "LANDSCAPE"]) {
    const style = getStyle(id)!;
    assert.ok(style, id);
    assert.equal(getRecipe(id).referenceMotion, id);
    assert.ok(getReferenceMotion(id)?.headline);
    for (const locale of ["fr", "en"] as const) assert.ok(getDictionary(locale).styles[id as keyof ReturnType<typeof getDictionary>["styles"]]);
    assert.ok(createProjectSchema.safeParse({ appName: "My brand", styleId: id, format, duration: 15, colors: style.palette, logo: null, screens: [], musicMode: "none", musicTrackId: null, music: null }).success);
  }
  assert.equal(getReferenceMotion("missing"), undefined);
});

test("motion reveals settle, restart predictably and remain bounded at arbitrary render frames", () => {
  assert.equal(referenceMotionTiming(0).settle, 0);
  assert.equal(referenceMotionTiming(1.5).settle, 1);
  assert.equal(referenceMotionTiming(1.5).burst, 0);
  assert.equal(referenceMotionTiming(3.6).settle, 0);
  assert.notEqual(referenceMotionTiming(.1).turn, referenceMotionTiming(1.5).turn);
  for (let frame = 0; frame <= 3600; frame += 7) {
    const state = referenceMotionTiming(frame / 30);
    assert.deepEqual(state, referenceMotionTiming(frame / 30));
    assert.ok(state.phase >= 0 && state.phase < 1);
    assert.ok(state.settle >= 0 && state.settle <= 1);
    assert.ok(state.burst >= 0 && state.burst <= 1);
    assert.ok(Math.abs(state.turn) <= 19);
  }
});
