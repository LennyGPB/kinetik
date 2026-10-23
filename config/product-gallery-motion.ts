import { productShotProgress } from "./product-shot-motion";
/** Stage-inspired camera choreography. The product and architecture remain visible throughout. */
export const PRODUCT_GALLERY_TRANSITIONS = ["zoom", "track", "rotary"] as const;
export function productGalleryTextOpacity(strength: number) { return Math.max(0, Math.min(1, 1 - Math.max(0, strength - .08) / .52)); }
export function productGalleryMotion(durations: number[], frame: number, fps: number, transitions?: string[]) {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const shot = (index: number, progress: number) => {
    const poses = [{ az: -.6, distance: 9.8, height: 2.7 }, { az: .05, distance: 8.6, height: 2.9 }, { az: .65, distance: 9.4, height: 4.3 }, { az: .18, distance: 8.1, height: 3.1 }];
    const pose = poses[index % poses.length];
    const k = productShotProgress(index, progress), final = index % 4 === 3;
    return { az: pose.az + k * (index % 2 ? -.18 : .22), distance: pose.distance + k * (final ? 1.6 : index % 4 === 1 ? -.55 : -1.1), height: pose.height + k * (final ? .65 : -.35) };
  };
  if (!durations.length) return { index: 0, local: 0, progress: 0, transitionStrength: 0, variant: 0, total: 1, screen: { a: 0, b: 0, mix: 0 }, camera: shot(0, 0) };
  const starts = durations.map((_, index) => Math.round(durations.slice(0, index).reduce((sum, value) => sum + value * fps, 0)));
  const total = Math.max(1, Math.round(durations.reduce((sum, value) => sum + value * fps, 0)));
  const lengths = starts.map((start, index) => Math.max(1, (starts[index + 1] ?? total) - start));
  const at = Math.max(0, Math.min(total - 1, frame));
  const index = Math.max(0, starts.findLastIndex((start) => at >= start));
  const local = at - starts[index], length = lengths[index] ?? fps;
  const incoming = (i: number) => i > 0 ? Math.min(fps * .58, lengths[i] * .24) : 0;
  const outgoing = (i: number) => i < lengths.length - 1 ? Math.min(fps * .36, lengths[i] * .2) : 0;
  const holdProgress = clamp((local - incoming(index)) / Math.max(1, length - incoming(index) - outgoing(index)));
  let a = index, b = index, mix = 0, strength = 0;
  if (index > 0 && local < incoming(index)) {
    a = index - 1;
    mix = ease((at - starts[index] + outgoing(a)) / Math.max(1, outgoing(a) + incoming(index)));
  } else if (index < lengths.length - 1 && local >= length - outgoing(index)) {
    b = index + 1;
    mix = ease((at - starts[b] + outgoing(index)) / Math.max(1, outgoing(index) + incoming(b)));
  }
  const chosen = PRODUCT_GALLERY_TRANSITIONS.findIndex((value) => value === transitions?.[b]);
  const variant = chosen >= 0 ? chosen : b % 3;
  let camera = shot(index, holdProgress);
  if (a !== b) {
    strength = Math.sin(mix * Math.PI) ** 2;
    const from = shot(a, 1), to = shot(b, 0);
    camera = { az: from.az + (to.az - from.az) * mix, distance: from.distance + (to.distance - from.distance) * mix, height: from.height + (to.height - from.height) * mix };
    // Travel directly between composed shots. No overshoot followed by a return
    // to the same viewpoint: depth comes from parallax against fixed architecture.
  } else if (index === 0) {
    const intro = 1 - ease(local / Math.max(1, Math.min(fps * .7, length * .25)));
    camera.distance += intro * 1.8;
    strength = intro * .65;
  }
  return { index, local, progress: holdProgress, transitionStrength: strength, variant, total, screen: { a, b, mix }, camera };
}
