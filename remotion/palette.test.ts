import assert from "node:assert/strict";
import { test } from "node:test";
import { scenePalette } from "./palette";

test("all five brand colours reach the rendered scene palettes", () => {
  const base: [string, string, string] = ["#080808", "#ff0000", "#00ff00"];
  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];
  const palettes = Array.from({ length: 5 }, (_, i) => scenePalette(base, colors, i));
  assert.deepEqual(palettes.slice(0, 4).map((p) => p[2]), colors.slice(1));
  assert.deepEqual(palettes.map((p) => p[1]), colors);
  assert.ok(palettes.every((p) => p[0] === base[0]));
  assert.equal(scenePalette(base, colors, 5)[1], colors[0]);
});

test("existing palettes with at most two colours keep their rendering", () => {
  const base: [string, string, string] = ["#ffffff", "#111111", "#777777"];
  for (const colors of [undefined, [], ["#111111"], ["#111111", "#777777"]]) {
    assert.deepEqual(scenePalette(base, colors, 3), base);
  }
});
