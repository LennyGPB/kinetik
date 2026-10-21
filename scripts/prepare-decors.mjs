// Prepare the user's public/decors photographs. Originals are never modified.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const ids = ['cafe', 'canape', 'desk', 'geant', 'night', 'setup'];
await mkdir('public/decors/prepared', { recursive: true });
const geometry = {};
for (const id of ids) {
  const { data, info: { width, height } } = await sharp(`public/decors/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const points = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 1] > 100 && data[i + 1] > data[i] * 2.2 && data[i + 1] > data[i + 2] * 2.2) points.push([x, y]);
  }
  if (points.length < 10000) throw new Error(`No usable green screen in ${id}`);
  const extreme = (score, max) => points.reduce((best, p) => (max ? score(p) > score(best) : score(p) < score(best)) ? p : best);
  const corners = [extreme(([x,y]) => x+y, false), extreme(([x,y]) => x-y, true), extreme(([x,y]) => x+y, true), extreme(([x,y]) => x-y, false)];
  geometry[id] = { width, height, corners };
  const minX = Math.min(...corners.map(p => p[0])) - 8, maxX = Math.max(...corners.map(p => p[0])) + 8;
  const minY = Math.min(...corners.map(p => p[1])) - 8, maxY = Math.max(...corners.map(p => p[1])) + 8;
  // Key the calibrated display only; leaves plants and other green objects untouched.
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const i = (y * width + x) * 4, r = data[i], g = data[i+1], b = data[i+2];
    const key = Math.max(0, Math.min(1, (g - Math.max(r,b) * 1.35 - 12) / 65));
    if (key > 0) { data[i+3] = Math.round(255 * (1-key)); data[i+1] = Math.min(g, Math.max(r,b)); }
  }
  await sharp(data, { raw: { width, height, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`public/decors/prepared/${id}.webp`);
  const cx = corners.reduce((sum,p)=>sum+p[0],0)/4, cy = corners.reduce((sum,p)=>sum+p[1],0)/4;
  const underlay = Buffer.from(`<svg width="${width}" height="${height}"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#231337"/><stop offset="1" stop-color="#7543c8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#a)"/><path d="M${cx-22},${cy-32} l55,32 -55,32Z" fill="#eee5ff"/></svg>`);
  const thumbnail = await sharp(underlay).composite([{ input: await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer() }]).png().toBuffer();
  await sharp(thumbnail).resize(960).webp({ quality: 85 }).toFile(`public/decors/prepared/${id}-thumb.webp`);
  for (const [file, description] of [
    [`public/decors/${id}.png`, 'Original photograph supplied by the project owner.'],
    [`public/decors/prepared/${id}.webp`, 'Derived from the supplied photograph; keyed green display, calibrated perspective, WebP transparency.'],
    [`public/decors/prepared/${id}-thumb.webp`, 'Derived from the supplied photograph; keyed display replaced by a purple video placeholder and play icon.'],
  ]) await writeFile(`${file}.json`, JSON.stringify({ prompt: `Source: user-provided public/decors/${id}.png. ${description} No AI image generation. Prepared by scripts/prepare-decors.mjs.` }, null, 2) + '\n');
  console.log(id, JSON.stringify(corners));
}
await writeFile('config/decor-geometry.json', JSON.stringify(geometry, null, 2) + '\n');
