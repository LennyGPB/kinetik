/**
 * Revue visuelle du template Stage (plateau 3D) : images clés de chaque scène et des transitions, dans les 3 formats.
 *   node --import tsx scripts/review-stage.ts                 → out/stage/*.png + planche contact
 *   node --import tsx scripts/review-stage.ts --template=zen  → un autre univers 3D (stage, monument, shoot, aquarium, zen, kiosk)
 *   node --import tsx scripts/review-stage.ts --gl=swangle    → même rendu en WebGL logiciel (comme sur Lambda), chronométré
 *   node --import tsx scripts/review-stage.ts --thumbnails    → miniatures de la galerie (public/templates/stage-*.jpg)
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, type ChromiumOptions } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getStyle } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";
import { beatGrid } from "../lib/projects/scenes";
import { sceneTimeline } from "../remotion/video/transitions";
import { FPS } from "../remotion/props";

async function main() {
  const args = process.argv.slice(2);
  const gl = (args.find((a) => a.startsWith("--gl="))?.slice(5) ?? "angle") as ChromiumOptions["gl"];
  const only = args.find((a) => a.startsWith("--format="))?.slice(9);
  const scale = Number(args.find((a) => a.startsWith("--scale="))?.slice(8) ?? 0.5);
  await mkdir("out/stage", { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const templateId = args.find((a) => a.startsWith("--template="))?.slice(11) ?? "stage";
  const style = getStyle(templateId)!;
  if (!style?.recipe.stage) throw new Error(`${templateId} n'est pas un template 3D`);
  if (args.includes("--thumbnails")) {
    await mkdir("public/templates", { recursive: true });
    // Plans larges : on doit reconnaître l'univers (intro en paysage et en portrait, scène de texte en carré)
    const picks = [["LANDSCAPE", "landscape", 0, 0.62], ["PORTRAIT", "portrait", 0, 0.7], ["SQUARE", "square", 2, 0.6]] as const;
    for (const [format, file, sceneIndex, at] of picks) {
      const inputProps = demoVideoProps(style, format, "en");
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4318, chromiumOptions: { gl } });
      const scene = sceneTimeline(inputProps.graph.scenes, FPS, inputProps.graph.bpm, beatGrid(inputProps.graph).phase)[sceneIndex];
      const output = `out/stage/thumb-${templateId}-${file}.png`;
      await renderStill({ serveUrl, composition, inputProps, frame: scene.from + Math.round(scene.duration * at), output, scale: 0.5, port: 4318, chromiumOptions: { gl } });
      await sharp(output).jpeg({ quality: 84, mozjpeg: true }).toFile(`public/templates/${templateId}-${file}.jpg`);
      console.log(`public/templates/${templateId}-${file}.jpg`);
    }
    return;
  }
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  const formats = (["LANDSCAPE", "PORTRAIT", "SQUARE"] as const).filter((f) => !only || f === only);
  for (const [row, format] of formats.entries()) {
    const inputProps = demoVideoProps(style, format, "fr");
    const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4318, chromiumOptions: { gl } });
    const timeline = sceneTimeline(inputProps.graph.scenes, FPS, inputProps.graph.bpm, beatGrid(inputProps.graph).phase);
    // Milieu de chaque scène, puis le cœur de chaque transition
    const frames = [...timeline.map((t) => t.from + Math.round(t.duration * 0.6)), ...timeline.slice(1).map((t) => t.from - 2)].sort((a, b) => a - b);
    for (const [col, frame] of frames.entries()) {
      const output = `out/stage/${templateId}-${format.toLowerCase()}-${String(frame).padStart(3, "0")}.png`;
      const started = Date.now();
      await renderStill({ serveUrl, composition, inputProps, frame, output, scale, port: 4318, chromiumOptions: { gl } });
      console.log(`${format} frame ${frame} · ${Date.now() - started} ms`);
      const w = 240, h = Math.round(w * composition.height / composition.width);
      tiles.push({ input: await sharp(output).resize(w, h).toBuffer(), left: col * 244, top: row * 440 });
    }
  }
  await sharp({ create: { width: 244 * 11, height: 440 * formats.length, channels: 4, background: "#222222" } }).composite(tiles).png().toFile(`out/stage/contact-${templateId}.png`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
