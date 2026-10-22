/** Render the five new worlds in all formats, with screen and boundary checks. */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getStyle } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";
import { beatGrid } from "../lib/projects/scenes";
import { sceneTimeline } from "../remotion/video/transitions";
import { FPS } from "../remotion/props";

async function main() {
  const target = process.argv.find(a => a.startsWith("--template="))?.slice(11);
  const ids = target ? [target] : ["loom", "tidal", "blueprint-3d", "solstice-3d", "assembly"];
  const dir = "out/stage-collection";
  await mkdir(dir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  try {
    for (const id of ids) {
      const tiles: { input: Buffer; left: number; top: number }[] = [];
      for (const [row, format] of (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).entries()) {
        const inputProps = demoVideoProps(getStyle(id)!, format, "fr");
        const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, puppeteerInstance: browser, port: 4329 });
        const timeline = sceneTimeline(inputProps.graph.scenes, FPS, inputProps.graph.bpm, beatGrid(inputProps.graph).phase);
        const screenIndex = inputProps.graph.scenes.findIndex(s => s.kind === "screens");
        const picks = [timeline[0].from + Math.round(timeline[0].duration * 0.65), timeline[screenIndex].from + Math.round(timeline[screenIndex].duration * 0.6), timeline[1].from - 2];
        for (const [col, frame] of picks.entries()) {
          const output = `${dir}/${id}-${format.toLowerCase()}-${col}.png`;
          await renderStill({ serveUrl, composition, inputProps, frame, output, scale: 0.5, puppeteerInstance: browser, port: 4329, onBrowserLog: log => { if (log.type === "error") console.error(log.text); } });
          const thumb = await sharp(output).resize({ width: 360, height: 400, fit: "inside" }).toBuffer();
          tiles.push({ input: thumb, left: col * 370, top: row * 410 });
          if (col === 0) await sharp(output).withExifMerge({ IFD0: { ImageDescription: `Source: Kinetik procedural Three.js/Remotion render; template ${id}; ${format}; frame ${frame}; scripts/review-stage-collection.ts. No stock or AI raster assets.` } }).jpeg({ quality: 88, mozjpeg: true }).toFile(`public/templates/${id}-${format === "LANDSCAPE" ? "landscape" : format === "PORTRAIT" ? "portrait" : "square"}.jpg`);
          console.log(`${id} ${format} ${col}: frame ${frame}`);
        }
      }
      await sharp({ create: { width: 1110, height: 1230, channels: 3, background: "#202025" } }).composite(tiles).png().toFile(`${dir}/contact-${id}.png`);
    }
  } finally { await browser.close({ silent: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
