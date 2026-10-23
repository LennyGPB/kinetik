/** Runway ↔ Stage visual QA: actual product scene, three formats and the travelling boundaries. */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { demoPhysicalProductProps } from "../lib/products/demo";
import { FPS } from "../remotion/props";

async function main() {
  const dir = "out/product-runway";
  await mkdir(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  try {
    for (const [row, format] of (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).entries()) {
      const inputProps = demoPhysicalProductProps("product-runway-3d", format, "fr");
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4335 });
      const durations = inputProps.graph.scenes.map(s => s.duration);
      const boundary = Math.round(durations[0] * FPS);
      const total = Math.round(durations.reduce((sum, d) => sum + d, 0) * FPS);
      const frames = [Math.round(boundary * .6), boundary - 8, boundary + 6, boundary + Math.round(durations[1] * FPS * .6), total - Math.round(durations.at(-1)! * FPS * .35)];
      for (const [col, frame] of frames.entries()) {
        const output = `${dir}/${format.toLowerCase()}-${col}.png`;
        await renderStill({ serveUrl, composition, inputProps, frame, output, scale: .5, puppeteerInstance: browser, port: 4335 });
        tiles.push({ input: await sharp(output).resize({ width: 320, height: 560, fit: "inside" }).toBuffer(), left: col * 330, top: row * 570 });
        if (col === 0) await sharp(output).withExifMerge({ IFD0: { ImageDescription: `Source: Kinetik procedural Three.js Runway 3D, shared Stage environment primitives, fictional FORME demo packshot. ${format}, frame ${frame}. scripts/review-product-runway.ts.` } }).jpeg({ quality: 88, mozjpeg: true }).toFile(`public/templates/product-runway-3d-${format === "LANDSCAPE" ? "landscape" : format === "PORTRAIT" ? "portrait" : "square"}.jpg`);
        console.log(`${format} frame ${frame}`);
      }
      if (format === "LANDSCAPE" && process.argv.includes("--video")) {
        await renderMedia({ serveUrl, composition, inputProps, outputLocation: `${dir}/runway-stage.mp4`, codec: "h264", scale: .5, muted: true, crf: 23, concurrency: 2, puppeteerInstance: browser, port: 4335 });
        console.log("Video: out/product-runway/runway-stage.mp4");
      }
    }
    await sharp({ create: { width: 1640, height: 1700, channels: 3, background: "#16171B" } }).composite(tiles).png().toFile(`${dir}/contact.png`);
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
