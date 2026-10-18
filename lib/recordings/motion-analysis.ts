import { defaultRecordingMotion, type RecordingClick, type RecordingZoom } from "./model";

type Region = { x: number; y: number; width: number; height: number; ratio: number };
type Change = { kind: "quiet" | "local" | "broad"; reason?: "cut" | "scroll" | "distributed"; region?: Region };
type Moment = Region & { onset: number; settled: number; lastMotion: number };
type Burst = { onset: number; lastMotion: number; baseline: Uint8ClampedArray; broad: boolean; focal?: Region };

/** Reject translations of textured content, including a scroll within a stationary app shell. */
function isScroll(before: Uint8ClampedArray, after: Uint8ClampedArray, width: number, height: number) {
  const gray = (pixels: Uint8ClampedArray, x: number, y: number) => {
    const i = (y * width + x) * 4;
    return (pixels[i] + pixels[i + 1] * 2 + pixels[i + 2]) / 4;
  };
  let baseline = 0, count = 0;
  const points: { x: number; y: number; value: number }[] = [];
  for (let y = 26; y < height - 26; y += 4) for (let x = 4; x < width - 4; x += 4) {
    const value = gray(before, x, y);
    if (Math.abs(value - gray(before, x, y + 2)) < 25) continue;
    const delta = Math.abs(value - gray(after, x, y));
    if (delta < 20) continue;
    points.push({ x, y, value }); baseline += delta; count++;
  }
  if (count < 24) return false;
  for (let shift = -24; shift <= 24; shift += 2) {
    if (!shift) continue;
    let error = 0;
    for (const p of points) error += Math.abs(p.value - gray(after, p.x, p.y + shift));
    if (error < baseline * 0.25) return true;
  }
  return false;
}

/** Connected changed tiles isolate the actual control instead of averaging distant updates. */
export function measureChange(before: Uint8ClampedArray, after: Uint8ClampedArray, width: number, height: number): Change {
  if (before.length !== width * height * 4 || after.length !== before.length) throw new Error("invalid_frame");
  const tile = 8, columns = Math.ceil(width / tile), rows = Math.ceil(height / tile);
  const counts = new Uint16Array(columns * rows);
  const xs = new Float64Array(counts.length), ys = new Float64Array(counts.length);
  let total = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (Math.abs(after[i] - before[i]) + Math.abs(after[i + 1] - before[i + 1]) + Math.abs(after[i + 2] - before[i + 2]) < 90) continue;
    const cell = Math.floor(y / tile) * columns + Math.floor(x / tile);
    counts[cell]++; xs[cell] += x; ys[cell] += y; total++;
  }
  // Tiny pointer trails, blinking carets and compression noise must not create a camera move.
  if (total / (width * height) < 0.0015) return { kind: "quiet" };
  if (total / (width * height) > 0.42) return { kind: "broad", reason: "cut" };
  if (isScroll(before, after, width, height)) return { kind: "broad", reason: "scroll" };
  const seen = new Uint8Array(counts.length);
  let best: Region | undefined, largest = 0;
  for (let seed = 0; seed < counts.length; seed++) {
    if (seen[seed] || counts[seed] < 2) continue;
    const queue = [seed]; seen[seed] = 1;
    let count = 0, xSum = 0, ySum = 0, left = columns, top = rows, right = 0, bottom = 0;
    for (let q = 0; q < queue.length; q++) {
      const cell = queue[q], x = cell % columns, y = Math.floor(cell / columns);
      count += counts[cell]; xSum += xs[cell]; ySum += ys[cell];
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * columns + nx;
        if (nx < 0 || nx >= columns || ny < 0 || ny >= rows || seen[next] || counts[next] < 2) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    if (count > largest) {
      largest = count;
      best = { x: xSum / count / width, y: ySum / count / height, width: Math.min(1, (right - left + 1) * tile / width), height: Math.min(1, (bottom - top + 1) * tile / height), ratio: count / (width * height) };
    }
  }
  if (!best) return { kind: "quiet" };
  if (largest / total < 0.55 || (best.width > 0.85 && best.height > 0.65)) return { kind: "broad", reason: "distributed", region: best };
  return { kind: "local", region: best };
}

/** Streaming detector: retain only previous frame + the frame before the current interaction. */
export class RecordingAnalyzer {
  private previous: Uint8ClampedArray | null = null;
  private previousTime = 0;
  private burst: Burst | null = null;
  private moments: Moment[] = [];
  private blocked: { start: number; end: number; cut: boolean }[] = [];

  constructor(private width: number, private height: number) {}

  push(time: number, frame: Uint8ClampedArray) {
    if (!Number.isFinite(time) || (this.previous && time <= this.previousTime)) throw new Error("invalid_sample_time");
    if (frame.length !== this.width * this.height * 4) throw new Error("invalid_frame");
    if (this.previous) {
      const change = measureChange(this.previous, frame, this.width, this.height);
      if (change.kind !== "quiet") {
        if (!this.burst) this.burst = { onset: (time + this.previousTime) / 2, lastMotion: time, baseline: this.previous, broad: false };
        this.burst.lastMotion = time;
        this.burst.broad ||= change.reason === "cut";
        if (!this.burst.focal && change.region && change.region.width < 0.6 && change.region.height < 0.65 && change.region.ratio >= 0.002) this.burst.focal = change.region;
      } else if (this.burst && time - this.burst.lastMotion >= 0.5 - 1e-8) this.closeBurst(time, frame);
    }
    // Own buffers: callers may recycle their canvas/readback storage.
    this.previous = frame.slice(); this.previousTime = time;
  }

  private closeBurst(time: number, frame: Uint8ClampedArray) {
    const burst = this.burst!;
    const net = measureChange(burst.baseline, frame, this.width, this.height);
    if (burst.broad || (net.kind === "broad" && net.reason !== "distributed") || burst.lastMotion - burst.onset > 6) {
      this.blocked.push({ start: burst.onset, end: time, cut: burst.broad || net.reason === "cut" });
    } else if (net.region && net.region.ratio >= 0.002
      // Ignore small edge-only overlays (browser notifications/taskbar), not a whole page.
      && !((net.region.y < 0.08 || net.region.y > 0.96) && net.region.height < 0.12 && net.region.ratio < 0.006)) {
      // A preview may update a larger area than the control that triggered it.
      const useResult = burst.focal && burst.focal.height < 0.12 && Math.max(net.region.width, net.region.height) > 0.75;
      const target = !useResult && burst.focal && (Math.max(net.region.width, net.region.height) > 0.55
        || Math.hypot(burst.focal.x - net.region.x, burst.focal.y - net.region.y) > 0.18) ? burst.focal : net.region;
      this.moments.push({ ...target, onset: burst.onset, lastMotion: burst.lastMotion, settled: time });
    }
    this.burst = null;
  }

  finish(duration: number): RecordingZoom[] {
    // Unsettled activity at the end has no confirmed result: keep a wide view.
    const blocks = [...this.blocked, ...(this.burst ? [{ start: this.burst.onset, end: duration, cut: this.burst.broad }] : [])];
    const moments: Moment[] = [];
    for (const moment of this.moments) {
      if (blocks.some((b) => moment.onset >= b.start - 0.25 && moment.onset < b.end + (b.cut ? 0.5 : 0.075))) continue;
      const last = moments.at(-1);
      if (last && moment.onset - last.lastMotion < 1.5 && moment.settled - last.onset < 8
        && Math.hypot(last.x - moment.x, last.y - moment.y) < 0.08
        && Math.abs(last.width - moment.width) < 0.15 && Math.abs(last.height - moment.height) < 0.15
        && !blocks.some((b) => b.start > last.onset && b.start < moment.onset)) {
        last.settled = moment.settled; last.lastMotion = moment.lastMotion;
        last.width = Math.max(last.width, moment.width); last.height = Math.max(last.height, moment.height);
      } else moments.push({ ...moment });
    }
    const zooms: RecordingZoom[] = [];
    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      const next = moments[i + 1];
      const nearbyBlock = blocks.find((b) => b.start > moment.onset);
      // Reach the target before the first visible response, rather than chasing its loudest frame.
      const priorBlock = blocks.findLast((b) => b.end <= moment.onset);
      const previous = zooms.at(-1);
      const start = Math.max(0, moment.onset - 0.85, priorBlock ? priorBlock.end + 0.08 : 0, previous ? previous.end + 0.08 : 0);
      const end = Math.min(duration, moment.settled + 1.6, next ? next.onset - 0.93 : duration, nearbyBlock ? nearbyBlock.start - 0.15 : duration);
      if (end - start < 1) continue;
      // Fit the changed content with context; large panels receive gentler framing.
      const extent = Math.max(moment.width, moment.height);
      const scale = Math.round(Math.max(1.2, Math.min(1.85, 0.8 / (extent + 0.14))) * 100) / 100;
      zooms.push({ id: `auto-${zooms.length}`, start: Math.ceil(start * 30) / 30, end: Math.floor(end * 30) / 30, x: moment.x, y: moment.y, scale, motion: defaultRecordingMotion(zooms.length) });
      if (zooms.length >= 30) break;
    }
    return zooms;
  }

  /** Visible responses suggest interactions, never proof of a physical mouse click. */
  suggestClicks(duration: number): RecordingClick[] {
    const result: RecordingClick[] = [];
    for (const moment of this.moments) {
      if (this.blocked.some((b) => moment.onset >= b.start - 0.25 && moment.onset < b.end + (b.cut ? 0.5 : 0.075))) continue;
      const time = Math.round((moment.onset + 0.125) * 30) / 30;
      if (time >= duration || result.some((click) => Math.abs(click.time - time) < 0.4 && Math.hypot(click.x - moment.x, click.y - moment.y) < 0.1)) continue;
      result.push({ id: `click-auto-${result.length}`, time, x: moment.x, y: moment.y });
      if (result.length >= 60) break;
    }
    return result;
  }
}
