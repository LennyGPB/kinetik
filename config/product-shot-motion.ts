const clamp = (value: number) => Math.max(0, Math.min(1, value));
const settle = (value: number) => { const t = clamp(value); return clamp(t * t * t * (t * (t * 6 - 15) + 10)); };

/** Reference-inspired pace: approach, inspection, accelerating reveal, then a settled hero. */
export function productShotProgress(index: number, progress: number) {
  const p = clamp(progress);
  switch (index % 4) {
    case 0: return .86 * settle(p / .55) + .14 * settle((p - .55) / .45);
    case 1: return settle(p);
    case 2: return .22 * settle(p / .5) + .78 * settle((p - .5) / .5);
    default: return settle(p / .72);
  }
}

/** The 2.5D counterpart moves only the supplied photograph, with bounded editorial crops. */
export function productPhotoMotion(style: string, index: number, progress: number) {
  const k = productShotProgress(index, progress), shot = index % 4;
  const strength = style === "product-floating" ? 1 : style === "product-editorial" ? .7 : .45;
  const poses = [
    { from: .88, to: 1.08, x: -14, endX: 0, roll: -2, endRoll: 0 },
    { from: 1.16, to: 1.2, x: 18, endX: -18, roll: 1, endRoll: -1 },
    { from: 1.02, to: 1.15, x: -12, endX: 10, roll: -5, endRoll: 4 },
    { from: 1.15, to: 1, x: 8, endX: 0, roll: 2, endRoll: 0 },
  ][shot];
  return { scale: 1 + ((poses.from + (poses.to - poses.from) * k) - 1) * strength,
    x: (poses.x + (poses.endX - poses.x) * k) * strength,
    roll: (poses.roll + (poses.endRoll - poses.roll) * k) * strength };
}
