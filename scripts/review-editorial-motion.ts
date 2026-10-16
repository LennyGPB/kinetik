import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { VIDEO_STYLES } from "../config/styles";
import { getEditorialMotion } from "../config/editorial-motion";
import { demoVideoProps } from "../lib/projects/demo-video";

async function main() {
  await mkdir("out/editorial-motion", { recursive: true });
  const serveUrl = await bundle({ entryPoint: "remotion/index.ts" });
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  const requested = process.argv.slice(2);
  const styles = VIDEO_STYLES.filter((item) => getEditorialMotion(item.id) && (!requested.length || requested.includes(item.id)));
  if (!styles.length) throw new Error("No matching editorial motion templates");
  for (const [i, style] of styles.entries()) {
    const inputProps = demoVideoProps(style, "PORTRAIT", "fr");
    const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4317 });
    for (const frame of [15, 35]) {
      const output = `out/editorial-motion/${style.id}-${frame}.png`;
      await renderStill({ serveUrl, composition, inputProps, frame, output, scale: 0.4, port: 4317 });
      tiles.push({ input: await sharp(output).resize(270, 480).toBuffer(), left: i * 270, top: frame === 15 ? 0 : 480 });
    }
    console.log(`Rendered ${style.name}`);
    for (const format of ["LANDSCAPE", "SQUARE"] as const) {
      const inputProps = demoVideoProps(style, format, "en");
      const composition = await selectComposition({ serveUrl, id: "Kinetik", inputProps, port: 4317 });
      await renderStill({ serveUrl, composition, inputProps, frame: 35, output: `out/editorial-motion/${style.id}-${format}.png`, scale: 0.3, port: 4317 });
    }
  }
  await sharp({ create: { width: styles.length * 270, height: 960, channels: 4, background: "#111111" } }).composite(tiles).png().toFile("out/editorial-motion/contact.png");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
