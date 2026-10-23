/** Real engine previews for the four product campaigns; optional --template=<id> and --video. */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { PRODUCT_CAMPAIGNS } from "../config/physical-product";
import { demoPhysicalProductProps } from "../lib/products/demo";
import { FPS } from "../remotion/props";

async function main() {
  const target = process.argv.find(a => a.startsWith("--template="))?.slice(11);
  const templates = PRODUCT_CAMPAIGNS.filter(item => !target || item.id === target);
  const dir = "out/product-campaigns";
  await mkdir(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    for (const template of templates) {
      const tiles: { input: Buffer; left: number; top: number }[] = [];
      for (const [row, format] of (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).entries()) {
        const inputProps = demoPhysicalProductProps(template.id, format, "fr");
        const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4338 });
        const durations = inputProps.graph.scenes.map(s => s.duration);
        const boundary = Math.round(durations[0] * FPS);
        const total = Math.round(durations.reduce((sum, d) => sum + d, 0) * FPS);
        const frames = [Math.round(boundary * .6), boundary + 3, boundary + Math.round(durations[1] * FPS * .6), total - Math.round(durations.at(-1)! * FPS * .35)];
        for (const [col, frame] of frames.entries()) {
          const output = `${dir}/${template.kind}-${format.toLowerCase()}-${col}.png`;
          await renderStill({ serveUrl, composition, inputProps, frame, output, scale: .5, puppeteerInstance: browser, port: 4338 });
          tiles.push({ input: await sharp(output).resize({ width: 320, height: 560, fit: "inside" }).toBuffer(), left: col * 330, top: row * 570 });
          if (col === 0) await sharp(output).withExifMerge({ IFD0: { ImageDescription: `Source: Kinetik procedural Three.js ${template.name} with the fictional FORME real demo photo. ${format}, frame ${frame}. scripts/review-product-campaigns.ts. User references inform materials and lighting only.` } }).jpeg({ quality: 88, mozjpeg: true }).toFile(`public/templates/${template.id}-${format === "LANDSCAPE" ? "landscape" : format === "PORTRAIT" ? "portrait" : "square"}.jpg`);
          console.log(`${template.kind} ${format} frame ${frame}`);
        }
        if (format === "PORTRAIT" && process.argv.includes("--video")) {
          await renderMedia({ serveUrl, composition, inputProps, outputLocation: `${dir}/${template.kind}.mp4`, codec: "h264", scale: .5, muted: true, crf: 23, concurrency: 2, puppeteerInstance: browser, port: 4338 });
          console.log(`Video: ${template.kind}`);
        }
      }
      await sharp({ create: { width: 1310, height: 1700, channels: 3, background: "#16171B" } }).composite(tiles).png().toFile(`${dir}/contact-${template.kind}.png`);
    }
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
