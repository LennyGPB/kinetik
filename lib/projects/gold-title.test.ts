import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { MetalTitle } from "../../remotion/video/reference-motion";

test("Gold Rush draws real vector letters outside the player, without background-clip text", async () => {
  for (const title of ["MAKE YOUR MOVE.", "MARQUEZ LES ESPRITS.", "La prochaine idée mérite de prendre forme."]) {
    const html = renderToStaticMarkup(createElement(MetalTitle, { text: title, time: 1.5, style: { maxWidth: 600 } }));
    assert.ok(!html.includes("background-clip") && !html.includes("-webkit-text-fill"));
    assert.ok(html.includes("<path") && html.includes("<linearGradient") && html.includes("<use"));
    const svg = html.match(/<svg[\s\S]*<\/svg>/)![0];
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 100) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    assert.ok(maxX - minX > info.width * .35, title);
    assert.ok(maxY - minY > info.height * .2, title);
    assert.ok(minX >= 0 && minY >= 0 && maxX < info.width && maxY < info.height);
  }
});

test("multiple Gold Rush previews use independent SVG definitions and escape editable titles", () => {
  const html = renderToStaticMarkup(createElement("div", null, ...[1, 2].map((i) => createElement(MetalTitle, { key: i, text: '<script>alert("x")</script>', time: 1 }))));
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!html.includes("<script>"));
});
