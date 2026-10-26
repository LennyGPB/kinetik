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

/** Pose relative d'une photo pendant un raccord (px sur une base 1080, degrés, pourcentages de découpe). */
export type Photo2DLayer = { x: number; y: number; scale: number; roll: number; blur: number; opacity: number; clipLeft: number; clipRight: number; front: boolean };

const still: Photo2DLayer = { x: 0, y: 0, scale: 1, roll: 0, blur: 0, opacity: 1, clipLeft: 0, clipRight: 0, front: false };

/**
 * Signature de chaque univers 2.5D quand deux photos différentes se relaient (`mix` 0 → 1, `b` = scène qui arrive) :
 * Studio glisse latéralement avec mise au point, Floating échange les produits sur une orbite, Editorial tourne la page.
 */
export function product2DSwap(style: string, mix: number, b: number): { outgoing: Photo2DLayer; incoming: Photo2DLayer } {
  const e = Math.max(0, Math.min(1, mix));
  if (style === "product-floating") {
    const dir = b % 2 ? 1 : -1;
    const orbit = (theta: number, side: number): Photo2DLayer => {
      const depth = (1 + Math.cos(theta)) / 2;
      return { ...still, x: side * Math.sin(theta) * 260, y: -Math.sin(theta) * 36, scale: .62 + .38 * depth, roll: side * Math.sin(theta) * 9, blur: (1 - depth) * 5, opacity: depth ** .7, front: depth >= .5 };
    };
    return { outgoing: orbit(e * Math.PI, dir), incoming: orbit((1 - e) * Math.PI, -dir) };
  }
  if (style === "product-editorial") {
    return {
      outgoing: { ...still, x: -150 * e * e, roll: -3 * e, clipRight: e * 100 },
      incoming: { ...still, x: 150 * (1 - e) ** 2, roll: 3 * (1 - e), clipLeft: (1 - e) * 100, front: true },
    };
  }
  return {
    outgoing: { ...still, x: -70 * e, scale: 1 - .05 * e, blur: 5 * e, opacity: 1 - e },
    incoming: { ...still, x: 70 * (1 - e), scale: 1.07 - .07 * e, blur: 5 * (1 - e), opacity: e, front: true },
  };
}

/** Avancée continue d'une scène à l'autre (index + mix pendant un raccord) : sert aux décors qui tournent sans revenir en arrière. */
export function product2DTurns(screen: { a: number; b: number; mix: number }) {
  return screen.a + (screen.a === screen.b ? 0 : screen.mix);
}
