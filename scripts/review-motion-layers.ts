/** Rendu de contrôle des calques animés libres (Scene.layers) : planche dans out/layers-review/sheet.png. */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
import { VIDEO_STYLES } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";
import { setLayers, updateScene, type EditEnv } from "../lib/projects/edit-ops";
import { FPS } from "../remotion/props";

async function main() {
  const root = "out/layers-review";
  await mkdir(root, { recursive: true });
  const style = VIDEO_STYLES.find((s) => !s.recipe.stage && !s.recipe.logoMotion && !s.id.startsWith("product"))!;
  const demo = demoVideoProps(style, "LANDSCAPE", "fr");
  const shot = `data:image/jpeg;base64,${(await readFile("public/templates/product-runway-3d-portrait.jpg")).toString("base64")}`;
  const base = { ...demo, screenUrls: [shot] };
  const env: EditEnv = { screenUrls: base.screenUrls, hasLogo: Boolean(base.logoUrl), transitions: base.recipe.transitions, stage: false };
  let graph = base.graph;
  const [first, second] = graph.scenes;
  graph = updateScene(graph, first.id, { duration: 3 }, env);
  graph = setLayers(graph, first.id, [
    { id: "bg", type: "rect", w: 1, h: 1, colors: ["#120a2e", "#3b1d8f"], gradient: "linear", gradientAngle: 120 },
    { id: "orb", type: "ellipse", x: 0.78, y: 0.3, w: 0.22, h: 0.39, colors: ["#ff7ad9", "#7a5cff"], gradient: "radial", blur: 0.02, loop: "float", loopAmount: 2 },
    { id: "kicker", type: "text", text: "NOUVEAU", font: "body", fontSize: 0.03, letterSpacing: 0.4, x: 0.3, y: 0.32, w: 0.5, align: "left", color: "#ffcc00", keyframes: [{ t: 0, opacity: 0, x: 0.25 }, { t: 0.5, opacity: 1, x: 0.3, ease: "out" }] },
    { id: "title", type: "text", text: "Tout change, en une seconde.", fontSize: 0.1, x: 0.4, y: 0.5, w: 0.7, align: "left", textReveal: "words", revealEffect: "rise", revealStart: 0.3, revealStagger: 0.08 },
    { id: "rule", type: "rect", x: 0.3, y: 0.68, w: 0.3, h: 0.008, color: "#ffcc00", keyframes: [{ t: 0.8, scaleX: 0 }, { t: 1.4, scaleX: 1, ease: "out" }] },
    { id: "shot", type: "image", screen: 0, x: 0.8, y: 0.62, w: 0.25, h: 0.5, radius: 0.02, shadow: 0.8, keyframes: [{ t: 0.6, y: 1.4, rotateY: -30 }, { t: 1.5, y: 0.62, rotateY: -12, ease: "spring" }] },
  ], env, true);
  graph = setLayers(graph, second.id, [
    { id: "stamp", type: "text", text: "-40 %", fontSize: 0.09, weight: 900, x: 0.85, y: 0.2, w: 0.25, color: "#ff3d6e", rotation: -12, keyframes: [{ t: 0.2, scale: 3, opacity: 0 }, { t: 0.6, scale: 1, opacity: 1, ease: "back" }], loop: "pulse" },
  ], env);
  const inputProps = { ...base, graph };
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4331 });
  const shots = [[first.id, 0.2], [first.id, 0.9], [first.id, 2.5], [second.id, 0.4], [second.id, 1.5]] as const;
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  for (const [i, [sceneId, time]] of shots.entries()) {
    const index = graph.scenes.findIndex((s) => s.id === sceneId);
    const start = graph.scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
    const out = `${root}/${i}.png`;
    await renderStill({ serveUrl, composition, inputProps, frame: Math.round((start + time) * FPS), output: out, port: 4331 });
    tiles.push({ input: await sharp(out).resize({ width: 640 }).toBuffer(), left: (i % 3) * 640, top: Math.floor(i / 3) * 360 });
  }
  await sharp({ create: { width: 1920, height: 720, channels: 3, background: "#000" } }).composite(tiles).png().toFile(`${root}/sheet.png`);
  console.log(style.id, "→", `${root}/sheet.png`);
}

main().catch((error) => { console.error(error); process.exit(1); });
