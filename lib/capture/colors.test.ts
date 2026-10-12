import assert from "node:assert/strict";
import test from "node:test";
import { suggestPalette } from "./colors";

test("brand accents precede frequent neutral backgrounds and similar shades are merged", () => {
  const palette = suggestPalette([
    { hex: "#ffffff", weight: 1000, accent: false },
    { hex: "#7c3aed", weight: 20, accent: true },
    { hex: "#7d3bee", weight: 10, accent: true },
    { hex: "#111111", weight: 100, accent: false },
  ]);
  assert.deepEqual(palette, ["#7c3aed", "#ffffff", "#111111"]);
});

test("palette suggestions reject malformed samples and stay within five colors", () => {
  assert.deepEqual(suggestPalette([{ hex: "red", weight: 20, accent: true }, { hex: "#ffffff", weight: NaN, accent: false }]), []);
  const palette = suggestPalette(["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ffffff", "#000000"].map((hex) => ({ hex, weight: 10, accent: true })));
  assert.equal(palette.length, 5);
});
