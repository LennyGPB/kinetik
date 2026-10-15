import type { ScreenFocus } from "../../lib/projects/scenes";

/** Move between framing targets directly, without returning to the full screenshot. */
export function framingTransition(previous: ScreenFocus | undefined, current: ScreenFocus, frame: number, frames: number) {
  const t = Math.max(0, Math.min(1, frame / Math.max(1, Math.min(12, Math.floor(frames * 0.25)))));
  const progress = t * t * (3 - 2 * t);
  const morph = Boolean(previous && previous.src === current.src && previous.mode === current.mode);
  const focus = previous && morph ? {
    ...current,
    x: previous.x + (current.x - previous.x) * progress,
    y: previous.y + (current.y - previous.y) * progress,
    w: previous.w + (current.w - previous.w) * progress,
    h: previous.h + (current.h - previous.h) * progress,
  } : current;
  return { focus, progress, morph };
}
