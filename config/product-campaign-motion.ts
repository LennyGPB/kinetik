import { productShotProgress } from "./product-shot-motion";
import type { ProductCampaignKind } from "./physical-product";
import { productGalleryMotion } from "./product-gallery-motion";

/** Frame-derived camera choreography shared by preview/export; photos stay facing the lens. */
export function productCampaignMotion(kind: ProductCampaignKind, durations: number[], frame: number, fps: number) {
  const state = productGalleryMotion(durations, frame, fps);
  const shots = {
    splash: [[-.4, 11.8, 4.1], [.3, 10.6, 3], [-.35, 11.4, 4.6], [.15, 12.2, 3.8]],
    nocturne: [[-.34, 11.8, 4.2], [.32, 10, 2.7], [-.28, 10.5, 4.4], [.2, 12, 3.8]],
    corde: [[-.35, 12, 4.5], [.3, 10.2, 2.9], [-.3, 11, 4.3], [.18, 12.5, 4]],
    sorbet: [[-.32, 11.8, 4.4], [.33, 10.6, 3], [-.32, 11.3, 4.5], [.22, 12.2, 4.2]],
    ion: [[-.32, 13.5, 3.8], [.3, 12.8, 2.9], [-.28, 13.4, 4.4], [.18, 14, 4.5]],
  }[kind];
  const shot = (index: number, progress: number) => {
    const [az, distance, height] = shots[index % shots.length];
    const t = productShotProgress(index, progress);
    const final = index % 4 === 3;
    const travel = index % 4 === 1 ? 1.15 : index % 4 === 0 ? 2.4 : 1.8;
    return { az: az + (index % 2 ? -.32 : .32) * t, distance: distance + (final ? -1.8 + t * 1.8 : -t * travel), height: height + (final ? -.75 + t * .75 : -t * .75) };
  };
  const { a, b, mix } = state.screen;
  const p = shot(a, a === b ? state.progress : 1), q = shot(b, a === b ? state.progress : 0);
  const time = frame / fps;
  return { ...state, camera: { az: p.az + (q.az - p.az) * mix, distance: p.distance + (q.distance - p.distance) * mix, height: p.height + (q.height - p.height) * mix },
    bank: Math.sin(time * .7) * (kind === "sorbet" ? .065 : .035),
    float: kind === "ion" ? 0 : Math.sin(time * .65) * .045,
    roll: kind === "splash" ? .22 + Math.sin(time * .45) * .06 : kind === "corde" ? -.16 + Math.sin(time * .6) * .07 : kind === "sorbet" ? Math.sin(time * .5) * .06 : kind === "nocturne" ? Math.sin(time * .3) * .012 : 0 };
}
