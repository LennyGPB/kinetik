/**
 * Rendu de contrôle des réglages ouverts au chat : briques de calques (tracés, icônes, particules, textes masqués, compteurs),
 * caméra / pose / coque sur Stage, caméra / pose sur un produit 3D. Planche : out/chat-bricks/sheet.png
 * Usage : node --import tsx scripts/review-chat-bricks.ts
 */
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
import { VIDEO_STYLES } from "../config/styles";
import { demoVideoProps } from "../lib/projects/demo-video";
import { demoPhysicalProductProps } from "../lib/products/demo";
import { setLayers, updateScene, updateVideo, type EditEnv } from "../lib/projects/edit-ops";
import type { VideoProps } from "../remotion/props";
import { FPS } from "../remotion/props";

type Shot = { label: string; props: VideoProps; sceneIndex: number; time: number };

async function main() {
  const root = "out/chat-bricks";
  await mkdir(root, { recursive: true });
  const shotImage = `data:image/jpeg;base64,${(await readFile("public/templates/product-runway-3d-portrait.jpg")).toString("base64")}`;
  const shots: Shot[] = [];

  // 1. Briques 2D
  const flatStyle = VIDEO_STYLES.find((s) => s.id === "spill")!;
  const flat = { ...demoVideoProps(flatStyle, "LANDSCAPE", "fr"), screenUrls: [shotImage] };
  const flatEnv: EditEnv = { screenUrls: flat.screenUrls, hasLogo: false, transitions: flat.recipe.transitions, stage: false };
  const first = flat.graph.scenes[0].id;
  let graph = updateScene(flat.graph, first, { duration: 3 }, flatEnv);
  graph = setLayers(graph, first, [
    { id: "bg", type: "rect", w: 1, h: 1, color: "#0d0b1f" },
    { id: "fx", type: "particles", w: 1, h: 1, particleCount: 60, particleMotion: "burst", particleShape: "spark", colors: ["#ffcc00", "#ff5ad1", "#7af0ff"], start: 0.2 },
    { id: "curve", type: "path", path: "M5 80 C 30 10, 60 10, 95 60", x: 0.5, y: 0.78, w: 0.8, h: 0.25, color: "#7af0ff", strokeWidth: 0.008, keyframes: [{ t: 0, draw: 0 }, { t: 1.2, draw: 1, ease: "out" }] },
    { id: "rocket", type: "icon", icon: "rocket", x: 0.14, y: 0.25, w: 0.12, h: 0.2, color: "#ffcc00", strokeWidth: 0.008, keyframes: [{ t: 0, draw: 0 }, { t: 1, draw: 1, ease: "inOut" }] },
    { id: "grad", type: "text", text: "Dégradé", fontSize: 0.12, x: 0.42, y: 0.25, w: 0.5, colors: ["#ff5ad1", "#ffcc00"], gradientAngle: 90 },
    { id: "photo", type: "text", text: "PHOTO", fontSize: 0.2, weight: 900, x: 0.78, y: 0.27, w: 0.4, screen: 0 },
    { id: "count", type: "text", text: "+{n} clients", fontSize: 0.1, x: 0.3, y: 0.52, w: 0.55, countFrom: 0, countTo: 12500, countDuration: 1.5 },
    { id: "knock", type: "rect", knockout: true, text: "SOLDES", fontSize: 0.09, weight: 900, x: 0.76, y: 0.55, w: 0.3, h: 0.18, radius: 0.02, colors: ["#ffcc00", "#ff5ad1"] },
  ], flatEnv, true);
  const flatProps = { ...flat, graph };
  shots.push({ label: "2D 0,8 s", props: flatProps, sceneIndex: 0, time: 0.8 }, { label: "2D 1,6 s", props: flatProps, sceneIndex: 0, time: 1.6 });

  // 2. Stage : caméra, pose, coque
  const stageStyle = VIDEO_STYLES.find((s) => s.id === "stage")!;
  const stage = demoVideoProps(stageStyle, "LANDSCAPE", "fr");
  const stageEnv: EditEnv = { screenUrls: stage.screenUrls, hasLogo: Boolean(stage.logoUrl), transitions: stage.recipe.transitions, stage: true };
  shots.push({ label: "Stage template", props: stage, sceneIndex: 1, time: 1 });
  let stageGraph = updateVideo(stage.graph, { deviceColor: "#1e40af" }, stageEnv);
  stageGraph = updateScene(stageGraph, stage.graph.scenes[1].id, { camera: { start: { angle: -45, height: 35, zoom: 1.3 }, frameX: 0.62 }, pose: { tilt: -15, turn: 25, roll: 8 } }, stageEnv);
  shots.push({ label: "Stage modifié", props: { ...stage, graph: stageGraph }, sceneIndex: 1, time: 1 });

  // 3. Produit 3D : caméra et pose
  const product = demoPhysicalProductProps("product-splash-3d", "LANDSCAPE", "fr");
  const productEnv: EditEnv = { screenUrls: product.screenUrls, hasLogo: false, transitions: product.recipe.transitions, stage: false, product3d: true };
  shots.push({ label: "Produit template", props: product, sceneIndex: 1, time: 1.2 });
  const productGraph = updateScene(product.graph, product.graph.scenes[1].id, { camera: { start: { angle: 0, height: 5, zoom: 0.75 }, frameX: 0.5 }, pose: { roll: -12, scale: 0.85, lift: 0.15 } }, productEnv);
  shots.push({ label: "Produit modifié", props: { ...product, graph: productGraph }, sceneIndex: 1, time: 1.2 });

  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  for (const [i, shot] of shots.entries()) {
    const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps: shot.props, port: 4351, puppeteerInstance: browser });
    const start = shot.props.graph.scenes.slice(0, shot.sceneIndex).reduce((sum, s) => sum + s.duration, 0);
    const out = `${root}/${i}.png`;
    await renderStill({ serveUrl, composition, inputProps: shot.props, frame: Math.round((start + shot.time) * FPS), output: out, scale: 0.5, port: 4351, puppeteerInstance: browser });
    const label = Buffer.from(`<svg width="640" height="40"><rect width="640" height="40" fill="#000" opacity=".6"/><text x="12" y="27" font-family="Arial" font-size="22" fill="#fff">${shot.label}</text></svg>`);
    tiles.push({ input: await sharp(out).resize({ width: 640, height: 360 }).composite([{ input: label, top: 0, left: 0 }]).toBuffer(), left: (i % 2) * 640, top: Math.floor(i / 2) * 360 });
    console.log("rendu", shot.label);
  }
  await browser.close({ silent: true });
  await sharp({ create: { width: 1280, height: 360 * Math.ceil(shots.length / 2), channels: 3, background: "#000" } }).composite(tiles).png().toFile(`${root}/sheet.png`);
  console.log(`${root}/sheet.png`);
}

main().catch((error) => { console.error(error); process.exit(1); });
