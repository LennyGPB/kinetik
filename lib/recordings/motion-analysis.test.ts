import assert from "node:assert/strict";
import test from "node:test";
import { measureChange, RecordingAnalyzer } from "./motion-analysis";
import { clickPulse, recordingCamera, recordingTilt, RECORDING_MOTIONS, RecordingSettingsSchema } from "./model";

const width = 160, height = 96;
function frame(rectangles: { x: number; y: number; w: number; h: number; color?: number }[] = []) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = data[i + 1] = data[i + 2] = 240; data[i + 3] = 255; }
  for (const r of rectangles) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = r.color ?? 40;
  }
  return data;
}
const control = { x: 100, y: 30, w: 24, h: 12 };

test("3D presets stay bounded, return flat at both ends and preserve old zoom behavior", () => {
  const zoom = { id: "zoom", start: 1, end: 5, x: 0.4, y: 0.5, scale: 1.8 };
  assert.deepEqual(recordingTilt([zoom], 3), { x: 0, y: 0 });
  for (const motion of RECORDING_MOTIONS) {
    const zooms = [{ ...zoom, motion }];
    for (const time of [0, 1, 5, 6]) {
      const result = recordingTilt(zooms, time);
      assert.equal(Math.abs(result.x), 0); assert.equal(Math.abs(result.y), 0);
    }
    for (let time = 1; time <= 5; time += 0.1) {
      const result = recordingTilt(zooms, time);
      assert.ok(Number.isFinite(result.x) && Math.abs(result.x) <= 10);
      assert.ok(Number.isFinite(result.y) && Math.abs(result.y) <= 12);
      assert.deepEqual(recordingTilt(zooms, time), result);
    }
  }
  assert.ok(recordingTilt([{ ...zoom, motion: "tilt-left" }], 3).y < 0);
  assert.ok(recordingTilt([{ ...zoom, motion: "tilt-right" }], 3).y > 0);
});

test("suggested clicks use response timing, stay inside the source and ignore static footage", () => {
  const detector = new RecordingAnalyzer(width, height);
  for (let t = 0; t < 7; t += 0.25) detector.push(t, frame(t < 2 ? [] : [control]));
  const clicks = detector.suggestClicks(7);
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].time, 2);
  assert.ok(clicks[0].x > 0.6 && clicks[0].y > 0.3);
  assert.deepEqual(detector.suggestClicks(7), clicks);
  const still = new RecordingAnalyzer(width, height);
  for (let t = 0; t < 4; t += 0.25) still.push(t, frame());
  assert.deepEqual(still.suggestClicks(4), []);
});

test("click effects are bounded and old recordings remain valid without click settings", () => {
  const base = { duration: 7, width, height, background: "#123456", padding: 7, radius: 18, frame: "browser", originalAudio: true, zooms: [] };
  assert.ok(RecordingSettingsSchema.safeParse(base).success);
  const click = { id: "click", time: 2, x: 0.4, y: 0.5 };
  assert.ok(RecordingSettingsSchema.safeParse({ ...base, clicks: [click] }).success);
  for (const clicks of [[{ ...click, time: 7 }], [{ ...click, x: 1.2 }], [click, click]]) assert.equal(RecordingSettingsSchema.safeParse({ ...base, clicks }).success, false);
  assert.equal(clickPulse(1, 2), null);
  assert.equal(clickPulse(2, 2)?.opacity, 0);
  assert.ok(clickPulse(2.12, 2)!.opacity > 0.5);
  assert.equal(clickPulse(3, 2), null);
});
function analyze(duration: number, imageAt: (t: number) => Uint8ClampedArray) {
  const detector = new RecordingAnalyzer(width, height);
  for (let t = 0; t < duration; t += 0.25) detector.push(t, imageAt(t));
  return detector.finish(duration);
}

test("zoom anticipates a persistent action and is at full scale when the response appears", () => {
  const zooms = analyze(8, (t) => frame(t >= 2 ? [control] : []));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].start < 1.2);
  assert.equal(recordingCamera(zooms, 2).scale, zooms[0].scale);
  assert.ok(zooms[0].end >= 4);
  assert.ok(zooms[0].x > 0.6);
});

test("an animation uses its onset and settled result, not its largest intermediate frame", () => {
  const zooms = analyze(9, (t) => {
    if (t < 2) return frame();
    return frame([{ ...control, w: t < 3 ? 8 + Math.round((t - 2) * 16) : 24 }]);
  });
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].start < 1.2);
  assert.ok(zooms[0].end >= 4.5);
});

test("repeated edits to the same field share one shot instead of zooming in and out", () => {
  const zooms = analyze(10, (t) => frame(t < 2 ? [] : [{ ...control, color: t < 3 ? 20 : t < 4 ? 90 : 160 }]));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].start < 1.2);
  assert.ok(zooms[0].end > 5.5);
});

test("moving tiny pointers, static frames and transient hover flashes do not create zooms", () => {
  assert.deepEqual(analyze(6, () => frame()), []);
  assert.deepEqual(analyze(6, (t) => frame([{ x: 10 + Math.floor(t) * 8, y: 15, w: 2, h: 3 }])), []);
  assert.deepEqual(analyze(6, (t) => frame(t === 2 ? [control] : [])), []);
});

test("broad scene changes do not trigger a zoom and interrupt any earlier shot", () => {
  const zooms = analyze(10, (t) => t >= 4 ? frame([{ x: 0, y: 0, w: width, h: height, color: 20 }]) : frame(t >= 2 ? [control] : []));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].end < 4);
});

test("vertical scrolling is rejected even when the shell is unchanged", () => {
  function page(offset: number) {
    const data = frame();
    for (let y = 8; y < height - 8; y++) for (let x = 35; x < width - 8; x++) {
      const color = ((y + offset) % 14 < 4 && x % 28 < 20) ? 30 : 240;
      const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = color;
    }
    return data;
  }
  assert.equal(measureChange(page(0), page(6), width, height).kind, "broad");
  assert.deepEqual(analyze(8, (t) => page(t < 2 ? 0 : t < 3 ? Math.floor((t - 2) * 24) : 24)), []);
});

test("large panels use a gentler scale and separated actions produce ordered valid intervals", () => {
  const zooms = analyze(14, (t) => frame([
    ...(t >= 2 ? [control] : []),
    ...(t >= 8 ? [{ x: 12, y: 45, w: 80, h: 38 }] : []),
  ]));
  assert.equal(zooms.length, 2);
  assert.ok(zooms[1].scale < zooms[0].scale);
  assert.ok(zooms[1].start > zooms[0].end);
  assert.ok(RecordingSettingsSchema.safeParse({ duration: 14, width, height, background: "#123456", padding: 7, radius: 18, frame: "browser", originalAudio: true, zooms }).success);
});

test("unfinished activity is not mistaken for a stable result at end of video", () => {
  assert.deepEqual(analyze(3, (t) => frame(t < 2.5 ? [] : [{ ...control, color: t < 2.75 ? 20 : 120 }])), []);
});

test("simultaneous form and preview updates are not treated as a scene cut", () => {
  const zooms = analyze(7, (t) => frame(t < 2 ? [] : [control, { x: 20, y: 60, w: 24, h: 12 }]));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].x > 0.6);
});

test("rapid actions on different controls retain separate non-overlapping shots", () => {
  const zooms = analyze(8, (t) => frame([
    ...(t >= 2 ? [control] : []),
    ...(t >= 3.25 ? [{ x: 20, y: 15, w: 20, h: 12 }] : []),
    ...(t >= 4.5 ? [{ x: 30, y: 65, w: 20, h: 12 }] : []),
  ]));
  assert.equal(zooms.length, 3);
  for (let i = 1; i < zooms.length; i++) assert.ok(zooms[i].start > zooms[i - 1].end);
});

test("a persistent distant preview response keeps the original control as the camera target", () => {
  const zooms = analyze(7, (t) => frame([
    ...(t === 2 ? [control] : []),
    ...(t >= 2.25 ? [{ x: 16, y: 60, w: 30, h: 20 }] : []),
  ]));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].x > 0.6);
});

test("small persistent edge overlays do not steal focus from later product interactions", () => {
  const zooms = analyze(8, (t) => frame([
    ...(t >= 1 ? [{ x: 130, y: 2, w: 12, h: 5 }] : []),
    ...(t >= 3 ? [control] : []),
  ]));
  assert.equal(zooms.length, 1);
  assert.ok(zooms[0].start > 2);
});

test("a scene cut retains its cooldown instead of treating an immediate overlay as an action", () => {
  const detector = new RecordingAnalyzer(width, height);
  const dark = frame([{ x: 0, y: 0, w: width, h: height, color: 0 }]);
  detector.push(0, dark);
  detector.push(0.25, frame());
  detector.push(0.5, frame());
  detector.push(0.75, frame());
  detector.push(1, frame([control]));
  detector.push(1.25, frame([control]));
  detector.push(1.5, frame([control]));
  // A full cut has a longer settling window than a scroll, excluding this early update.
  assert.deepEqual(detector.finish(5), []);
});
