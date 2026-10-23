/** Real engine previews for the physical-product cameras; optional --template=<id> and --video. */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PRODUCT_TEMPLATES } from "../config/physical-product";
import { demoPhysicalProductProps } from "../lib/products/demo";
import { FPS } from "../remotion/props";

async function main() {
  const target = process.argv.find(a => a.startsWith("--template="))?.slice(11);
  const templates = PRODUCT_TEMPLATES.filter(item => !target || item.id === target);
  const dir = "out/product-camera-review";
  await mkdir(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    for (const template of templates) {
      const tiles: { input: Buffer; left: number; top: number }[] = [];
      for (const [row, format] of (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).entries()) {
        const inputProps = demoPhysicalProductProps(template.id, format, "fr");
        const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4340 });
        const durations = inputProps.graph.scenes.map(s => s.duration);
        const boundary = Math.round(durations[0] * FPS);
        const total = Math.round(durations.reduce((sum, d) => sum + d, 0) * FPS);
        const frames = [Math.round(boundary * .15), Math.round(boundary * .55), Math.round(boundary * .84), boundary + Math.round(durations[1] * FPS * .45), boundary + Math.round((durations[1] + durations[2] * .6) * FPS), total - Math.round(durations.at(-1)! * FPS * .15)];
        for (const [col, frame] of frames.entries()) {
          const output = `${dir}/${template.id}-${format.toLowerCase()}-${col}.png`;
          await renderStill({ serveUrl, composition, inputProps, frame, output, scale: .5, puppeteerInstance: browser, port: 4340 });
          tiles.push({ input: await sharp(output).resize({ width: 320, height: 560, fit: "inside" }).toBuffer(), left: col * 330, top: row * 570 });
          if (col === 1) await sharp(output).withExifMerge({ IFD0: { ImageDescription: `Source: Kinetik procedural Three.js ${template.name} with the fictional FORME real demo photo. ${format}, frame ${frame}. scripts/review-product-campaigns.ts. User references inform materials and lighting only.` } }).jpeg({ quality: 88, mozjpeg: true }).toFile(`public/templates/${template.id}-${format === "LANDSCAPE" ? "landscape" : format === "PORTRAIT" ? "portrait" : "square"}.jpg`);
          console.log(`${template.id} ${format} frame ${frame}`);
        }
        if (format === "PORTRAIT" && process.argv.includes("--video")) {
          await renderMedia({ serveUrl, composition, inputProps, outputLocation: `${dir}/${template.id}.mp4`, codec: "h264", scale: .5, muted: true, crf: 23, concurrency: 2, puppeteerInstance: browser, port: 4340 });
          console.log(`Video: ${template.id}`);
        }
      }
      await sharp({ create: { width: 1970, height: 1700, channels: 3, background: "#16171B" } }).composite(tiles).png().toFile(`${dir}/contact-${template.id}.png`);
    }
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
