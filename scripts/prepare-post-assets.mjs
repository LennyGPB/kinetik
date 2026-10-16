// Build-time assets only. The app and exports never fetch third-party photos or fonts.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import sharp from "sharp";
import opentype from "opentype.js";

await Promise.all([mkdir("public/post-demos", { recursive: true }), mkdir("public/post-fonts", { recursive: true }), mkdir("lib/posts/fonts", { recursive: true })]);
const photos = { workspace: 2047905, interior: 1571460, desert: 1001435, flowers: 931177, detail: 4862867, team: 8134186, lake: 346529, city: 26612666, "portrait-1": 220453, "portrait-2": 774909, "portrait-3": 2379004, "portrait-4": 1239291, "portrait-5": 614810, "portrait-6": 415829 };
await Promise.all(Object.entries(photos).map(async ([name, id]) => {
  if (await readFile(`public/post-demos/${name}.jpg`).then(() => true, () => false)) return;
  const response = await fetch(`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${name.startsWith("portrait") ? 450 : 1400}`);
  if (!response.ok) throw new Error(`photo ${id}: ${response.status}`);
  await writeFile(`public/post-demos/${name}.jpg`, await sharp(Buffer.from(await response.arrayBuffer())).resize({ width: name.startsWith("portrait") ? 450 : 1400, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer());
}));
const fonts = { wide: ["archivoblack", "ArchivoBlack-Regular.ttf"], anton: ["anton", "Anton-Regular.ttf"], instrument: ["instrumentserif", "InstrumentSerif-Regular.ttf"], "instrument-italic": ["instrumentserif", "InstrumentSerif-Italic.ttf"] };
for (const [name, [folder, filename]] of Object.entries(fonts)) {
  if (await readFile(`lib/posts/fonts/${name}.json`).then(() => true, () => false)) continue;
  const response = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/${filename}`);
  if (!response.ok) throw new Error(`font ${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`public/post-fonts/${filename}`, bytes);
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/OFL.txt`);
  if (!license.ok) throw new Error("font_license_missing");
  await writeFile(`public/post-fonts/${folder}-OFL.txt`, await license.text());
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const chars = [...new Set([...Array.from({ length: 224 }, (_, i) => String.fromCharCode(32 + i)), ..."Œœ’‘“”–—…→€"] )];
  const glyphs = Object.fromEntries(chars.map((char) => { const glyph = font.charToGlyph(char); return [char, { advance: glyph.advanceWidth, path: glyph.getPath(0, 0, font.unitsPerEm).toPathData(2) }]; }));
  await writeFile(`lib/posts/fonts/${name}.json`, JSON.stringify({ units: font.unitsPerEm, glyphs }));
}
// Check the generated files before announcing completion.
const ratios = {};
for (const name of Object.keys(photos)) { const meta = await sharp(await readFile(`public/post-demos/${name}.jpg`)).metadata(); ratios[`/post-demos/${name}.jpg`] = meta.width / meta.height; }
await writeFile("lib/posts/demo-ratios.json", JSON.stringify(ratios));
console.log(`Prepared ${Object.keys(photos).length} local demo photos and ${Object.keys(fonts).length} font outline sets.`);
