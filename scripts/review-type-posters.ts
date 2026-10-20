import { bundle } from "@remotion/bundler";
import { renderFrames, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { VIDEO_STYLES } from "../config/styles";
import { TYPE_POSTERS } from "../config/type-posters";
import { demoVideoProps } from "../lib/projects/demo-video";
import { FPS } from "../remotion/props";
import { sceneTimeline } from "../remotion/video/transitions";

async function main() {
  const root = "out/type-posters";
  const renderPort = process.argv.includes("--mockups") ? 4323 : 4321;
  await mkdir(root, { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const requested = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  const ids = Object.keys(TYPE_POSTERS).filter(id => !requested.length || requested.includes(id));
  if (!ids.length) throw Error("No matching type posters");
  if (process.argv.includes("--fluidity")) {
    const report: Record<string, { frame: number; difference: number }[]> = {};
    const spikes: string[] = [];
    for (const id of ids) {
      const style = VIDEO_STYLES.find(s => s.id === id)!;
      const inputProps = demoVideoProps(style, "PORTRAIT", "en");
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4322 });
      const frames = new Map<number, Buffer>();
      await renderFrames({ serveUrl, composition, inputProps, outputDir: null, imageFormat: "png", frameRange: [65, 115], scale: 0.25, concurrency: 2, port: 4322,
        onStart: () => {}, onFrameUpdate: () => {},
        // Supersample thin type before measuring, so subpixel rasterisation isn't mistaken for a motion jump.
        onFrameBuffer: async (buffer, frame) => { frames.set(frame, await sharp(buffer).resize({ width: 108 }).blur(0.5).removeAlpha().raw().toBuffer()); },
      });
      const differences: { frame: number; difference: number }[] = [];
      for (let frame = 66; frame <= 115; frame++) {
        const a = frames.get(frame - 1)!, b = frames.get(frame)!;
        let delta = 0;
        for (let j = 0; j < a.length; j++) delta += Math.abs(a[j] - b[j]);
        differences.push({ frame, difference: delta / a.length / 255 });
      }
      report[id] = differences;
      for (let i = 1; i < differences.length - 1; i++) {
        const sample = differences[i];
        if (sample.difference > 0.02 && sample.difference > 2 * Math.max(differences[i - 1].difference, differences[i + 1].difference)) spikes.push(`${id} ${sample.frame}`);
      }
      console.log(`${style.name}: 51 consecutive frames measured`);
    }
    await writeFile(`${root}/fluidity.json`, JSON.stringify(report, null, 2));
    if (spikes.length) throw Error(`Isolated frame jumps: ${spikes.join(", ")}`);
    return;
  }
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  const errors = new Set<string>();
  for (const [column, id] of ids.entries()) {
    const style = VIDEO_STYLES.find(s => s.id === id)!;
    for (const [row, format] of (["PORTRAIT", "SQUARE", "LANDSCAPE"] as const).entries()) {
      const inputProps = demoVideoProps(style, format, "fr");
      if (inputProps.graph.scenes.some(s => s.title !== style.name.toUpperCase())) throw Error(`Preview name drift: ${id}`);
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: renderPort });
      const timeline = sceneTimeline(inputProps.graph.scenes, FPS, 120);
      const boundary = timeline[1].from;
      const mockupFrames = timeline.filter(item => item.scene.kind === "screens").map(item => item.from + Math.floor(item.duration / 2));
      const frames = process.argv.includes("--ambient") ? [45, 55, 65] : process.argv.includes("--mockups") ? mockupFrames : [8, 45, boundary - 6, boundary, boundary + 8, ...mockupFrames, composition.durationInFrames - 20];
      for (const frame of frames) {
        const output = `${root}/${id}-${format}-${frame}.png`;
        await renderStill({ serveUrl, composition, inputProps, output, frame, scale: 0.25, port: renderPort,
          onBrowserLog: log => { if (log.type === "error" || log.type === "warning") errors.add(JSON.stringify(log)); },
        });
        if (frame === 45) tiles.push({ input: await sharp(output).resize(360, 450, { fit: "contain", background: "#202020" }).png().toBuffer(), left: column * 360, top: row * 450 });
      }
    }
    console.log(`Verified ${style.name}: ${process.argv.includes("--ambient") ? "three moments of continuous animation" : process.argv.includes("--mockups") ? "phone and browser mockups" : "name, entry, settled, outgoing, incoming, mockups, ending"} in 3 formats`);
  }
  if (tiles.length) await sharp({ create: { width: ids.length * 360, height: 1350, channels: 4, background: "#202020" } }).composite(tiles).png().toFile(`${root}/formats.png`);
  await writeFile(`${root}/browser-log.json`, JSON.stringify([...errors], null, 2));
  // Control frames must be byte-identical to the pre-change baseline.
  for (const id of ["patina", "offprint", "torque"]) {
    const style = VIDEO_STYLES.find(s => s.id === id)!;
    for (const format of ["PORTRAIT", "SQUARE", "LANDSCAPE"] as const) {
      const inputProps = demoVideoProps(style, format, "en");
      // Baseline portrait was French.
      if (format === "PORTRAIT") Object.assign(inputProps, demoVideoProps(style, format, "fr"));
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: renderPort });
      const output = `${root}/control-${id}-${format}.png`;
      await renderStill({ serveUrl, composition, inputProps, output, frame: 35, scale: format === "PORTRAIT" ? 0.4 : 0.3, port: renderPort });
      const baseline = `out/type-poster-baseline/${id}-${format === "PORTRAIT" ? "35" : format}.png`;
      const a = await sharp(await readFile(output)).raw().toBuffer();
      const b = await sharp(await readFile(baseline)).raw().toBuffer();
      if (!a.equals(b)) throw Error(`Control differs: ${id} ${format}`);
    }
    console.log(`Unchanged pixels: ${id}, 3 formats`);
  }
  console.log(`Browser diagnostics: ${errors.size}; see ${root}/browser-log.json`);
  if (errors.size) throw Error("Browser diagnostics must be resolved before shipping");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
