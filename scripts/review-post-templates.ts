/** Planche de contrôle des templates de posts : pages de démo en feed, carré et story. Usage : node --import tsx --conditions=react-server scripts/review-post-templates.ts post-nexus → out/post-post-nexus.png */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { demoPost } from "../lib/posts/document";
import { postSvg } from "../lib/posts/svg";
import { POST_FORMATS } from "../config/post-templates";
// Rendu de contrôle : pages de démo dans les trois formats, photos de démo embarquées
async function main() {
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  let row = 0;
  for (const id of process.argv.slice(2)) for (const format of ["FEED", "SQUARE", "STORY"] as const) {
    const doc = { ...demoPost(id, "fr"), format };
    for (const [i] of doc.pages.entries()) {
      let svg = postSvg(doc, i, { demo: true, appName: "KINETIK" });
      // Les photos de démo sont des chemins publics : on les embarque pour Sharp
      for (const m of new Set(svg.match(/\/post-demos\/[a-z0-9-]+\.jpg/g) ?? [])) svg = svg.split(`"${m}"`).join(`"data:image/jpeg;base64,${(await readFile(`public${m}`)).toString("base64")}"`);
      const { width, height } = POST_FORMATS[format], scale = 300 / width;
      tiles.push({ input: await sharp(Buffer.from(svg)).resize(300, Math.round(height * scale)).png().toBuffer(), left: i * 310, top: row });
      if (i === doc.pages.length - 1) row += Math.round(height * scale) + 10;
    }
  }
  await sharp({ create: { width: 930, height: row, channels: 3, background: "#222" } }).composite(tiles).png().toFile(`out/post-${process.argv[2]}.png`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
