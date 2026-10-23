/** Modern ICO containers embed PNG frames. Prefer the largest valid frame; Sharp handles plain PNG/SVG separately. */
export function iconPng(data: Buffer): Buffer | null {
  if (data.length < 6 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) return null;
  const count = data.readUInt16LE(4);
  if (count > 100 || data.length < 6 + count * 16) return null;
  let best: { area: number; image: Buffer } | null = null;
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16, width = data[entry] || 256, height = data[entry + 1] || 256;
    const size = data.readUInt32LE(entry + 8), offset = data.readUInt32LE(entry + 12);
    if (size < 8 || offset < 6 + count * 16 || offset + size > data.length) continue;
    const image = data.subarray(offset, offset + size);
    if (image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && (!best || width * height > best.area)) best = { area: width * height, image };
  }
  return best?.image ?? null;
}
