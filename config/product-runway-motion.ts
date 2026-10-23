import { productShotProgress } from "./product-shot-motion";
import { productGalleryMotion } from "./product-gallery-motion";

/** Fixed stations in one continuous set. Camera coordinates are world-space. */
export function runwayStation(index: number) { return { x: index * 6, z: index % 2 ? -2 : 0 }; }
export function productRunwayMotion(durations: number[], frame: number, fps: number) {
  const state = productGalleryMotion(durations, frame, fps);
  const { a, b, mix } = state.screen;
  const from = runwayStation(a), to = runwayStation(b);
  const lerp = (start: number, end: number) => start + (end - start) * mix;
  // Paced crane/orbit during held shots, then a continuous journey between fixed stations.
  const poses = [
    [{ az: -.42, distance: 11.5, height: 4.8 }, { az: -.18, distance: 9.2, height: 3.1 }],
    [{ az: .2, distance: 9.6, height: 3.5 }, { az: .07, distance: 8.9, height: 2.9 }],
    [{ az: -.28, distance: 10.2, height: 4.3 }, { az: -.1, distance: 9.2, height: 3.1 }],
    [{ az: .06, distance: 9, height: 3 }, { az: -.18, distance: 12.2, height: 5 }],
  ];
  const shot = (index: number, progress: number) => {
    const [start, end] = poses[index % poses.length];
    const k = productShotProgress(index, progress);
    return { az: start.az + (end.az - start.az) * k, distance: start.distance + (end.distance - start.distance) * k, height: start.height + (end.height - start.height) * k };
  };
  const p = shot(a, a === b ? state.progress : 1), q = shot(b, a === b ? state.progress : 0);
  const target = { x: lerp(from.x, to.x), y: 1.7, z: lerp(from.z, to.z) };
  const az = lerp(p.az, q.az), distance = lerp(p.distance, q.distance);
  return { ...state, target, position: { x: target.x + Math.sin(az) * distance, y: lerp(p.height, q.height), z: target.z + Math.cos(az) * distance } };
}
