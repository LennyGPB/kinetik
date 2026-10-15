import assert from "node:assert/strict";
import test from "node:test";
import { VIDEO_STYLES } from "../../config/styles";
import { projectVisual } from "./visuals";

test("unbranded templates retain their catalog palette", () => {
  for (const style of VIDEO_STYLES) {
    assert.deepEqual(projectVisual({ styleId: style.id, colors: [] }).palette, style.palette);
  }
});

test("purple and black replace Terrain's green background and accents", () => {
  const { palette } = projectVisual({ styleId: "terrain", colors: ["#7c3aed", "#000000"] });
  assert.deepEqual(palette, ["#0a0513", "#7c3aed", "#000000"]);
});

test("light templates keep a light background tinted with the brand", () => {
  const { palette } = projectVisual({ styleId: "apple", colors: ["#7c3aed"] });
  assert.deepEqual(palette, ["#f7f3fe", "#7c3aed", "#7c3aed"]);
});
