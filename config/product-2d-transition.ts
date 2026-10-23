import { productGalleryMotion } from "./product-gallery-motion";
import { productPhotoMotion } from "./product-shot-motion";

/** One persistent photograph stage, including both halves of every scene boundary. */
export function product2DTransition(style: string, durations: number[], frame: number, fps: number) {
  const state = productGalleryMotion(durations, frame, fps);
  const { a, b, mix } = state.screen;
  const p = productPhotoMotion(style, a, a === b ? state.progress : 1);
  const q = productPhotoMotion(style, b, a === b ? state.progress : 0);
  const arc = a === b ? 0 : Math.sin(mix * Math.PI) ** 2;
  const floating = style === "product-floating", editorial = style === "product-editorial";
  const lerp = (start: number, end: number) => start + (end - start) * mix;
  return { ...state, photo: {
    scale: lerp(p.scale, q.scale) + arc * (floating ? .07 : editorial ? .025 : .035),
    x: lerp(p.x, q.x) + arc * (floating ? (b % 2 ? 42 : -42) : 0),
    y: arc * (floating ? -34 : 0),
    roll: lerp(p.roll, q.roll) + arc * (floating ? (b % 2 ? -5 : 5) : 0),
    blur: arc * (floating ? 1.4 : editorial ? 0 : .7),
  }, decorShift: editorial ? arc * -65 : floating ? arc * 35 : 0 };
}
