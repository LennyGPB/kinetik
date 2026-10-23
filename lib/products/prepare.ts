import sharp from "sharp";

/** Conservative border-connected matte: never invents hidden surfaces or changes label pixels. */
export async function prepareProductImage(input: Buffer) {
  const { data, info } = await sharp(input, { limitInputPixels: 25_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info, count = width * height;
  const original = Buffer.from(data);
  const small = Math.min(width, height) < 600;
  const samples = [0, width - 1, (height - 1) * width, count - 1];
  const transparent = samples.every((p) => data[p * 4 + 3] < 16);
  const bg = [0, 1, 2].map((c) => samples.reduce((sum, p) => sum + data[p * 4 + c], 0) / 4);
  const distance = (p: number) => Math.sqrt([0, 1, 2].reduce((sum, c) => sum + (data[p * 4 + c] - bg[c]) ** 2, 0));
  let status: "transparent" | "removed" | "original" = transparent ? "transparent" : "original";
  if (!transparent && samples.every((p) => data[p * 4 + 3] > 245 && distance(p) < 16)) {
    const queue = new Int32Array(count), visited = new Uint8Array(count);
    let head = 0, tail = 0;
    const add = (p: number) => { if (!visited[p] && distance(p) < 38) { visited[p] = 1; queue[tail++] = p; } };
    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
    while (head < tail) {
      const p = queue[head++], x = p % width;
      data[p * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (distance(p) - 18) / 20)));
      if (x > 0) add(p - 1); if (x + 1 < width) add(p + 1);
      if (p >= width) add(p - width); if (p + width < count) add(p + width);
    }
    // Reject a matte that removes almost everything, or fails to separate a substantial object.
    const removed = tail / count;
    if (removed > .05 && removed < .94) status = "removed";
    else original.copy(data);
  }
  let left = width, top = height, right = -1, bottom = -1;
  for (let p = 0; p < count; p++) if (data[p * 4 + 3] > 32) {
    const x = p % width, y = Math.floor(p / width);
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) throw new Error("empty_image");
  const cropped = await sharp(data, { raw: { width, height, channels: 4 } }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).resize({ width: 1400, height: 1400, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true }).png().toBuffer();
  const metadata = await sharp(cropped).metadata();
  return { data: cropped, width: metadata.width!, height: metadata.height!, status, small };
}
