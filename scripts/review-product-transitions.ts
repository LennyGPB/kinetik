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
  const templates = PRODUCT_TEMPLATES.filter(item => ["product-studio", "product-floating", "product-editorial"].includes(item.id) && (!target || item.id === target));
  const different = process.argv.includes("--different-photos");
  const dir = different ? "out/product-transitions/different-photos" : "out/product-transitions";
  await mkdir(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    for (const template of templates) {
      const tiles: { input: Buffer; left: number; top: number }[] = [];
      for (const [row, format] of (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).entries()) {
        const inputProps = demoPhysicalProductProps(template.id, format, "fr");
        if (different) {
          const photo = sharp("public/product-demos/forme.png");
          const meta = await photo.metadata();
          const cropped = await photo.extract({left: Math.round(meta.width!*.15), top: Math.round(meta.height!*.12), width: Math.round(meta.width!*.7), height: Math.round(meta.height!*.76)}).png().toBuffer();
          const source = `data:image/png;base64,${cropped.toString("base64")}`;
          inputProps.screenUrls.push(source);
          inputProps.graph.scenes.forEach((scene, index) => { if (index % 2) scene.screens = [source]; });
        }
        const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4342 });
        const durations = inputProps.graph.scenes.map(s => s.duration);
        const boundary = Math.round(durations[0] * FPS);
        const frames = [boundary - 10, boundary - 4, boundary + 2, boundary + 8, boundary + 16, boundary + 25];
        for (const [col, frame] of frames.entries()) {
          const output = `${dir}/${template.id}-${format.toLowerCase()}-${col}.png`;
          await renderStill({ serveUrl, composition, inputProps, frame, output, scale: .5, puppeteerInstance: browser, port: 4342 });
          tiles.push({ input: await sharp(output).resize({ width: 320, height: 560, fit: "inside" }).toBuffer(), left: col * 330, top: row * 570 });
          console.log(`${template.id} ${format} frame ${frame}`);
        }
        if (format === "PORTRAIT" && process.argv.includes("--video")) {
          await renderMedia({ serveUrl, composition, inputProps, outputLocation: `${dir}/${template.id}.mp4`, codec: "h264", scale: .5, muted: true, crf: 23, concurrency: 2, puppeteerInstance: browser, port: 4342 });
          console.log(`Video: ${template.id}`);
        }
      }
      await sharp({ create: { width: 1970, height: 1700, channels: 3, background: "#16171B" } }).composite(tiles).png().toFile(`${dir}/contact-${template.id}.png`);
    }
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
