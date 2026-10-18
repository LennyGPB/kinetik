import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_MOCKUPS, deviceGeometry } from "../../config/device-mockups";
import { recordingFrame, recordingTarget } from "./framing";
import { RecordingSettingsSchema } from "./model";
import { applyQuickSetting, isQuickSetting } from "../projects/settings";
import type { SceneGraph } from "../projects/scenes";

const settings = { duration: 8, width: 1920, height: 1080, background: "#000000", padding: 7, radius: 18, frame: "browser" as const, originalAudio: false, zooms: [] };

test("every device contains landscape and portrait sources without changing their aspect ratio", () => {
  for (const model of DEVICE_MOCKUPS) for (const [width, height] of [[1920, 1080], [1080, 1920], [1080, 1080]]) for (const ratio of [16 / 9, 9 / 19.5, 1]) {
    const box = deviceGeometry(model.id, width, height, ratio);
    assert.ok(box.w <= width + 1e-7 && box.h <= height + 1e-7);
    assert.ok(Math.abs(box.screen.w / box.screen.h - ratio) < 1e-7);
    assert.ok(box.screen.x >= box.viewport.x - 1e-7 && box.screen.y >= box.viewport.y - 1e-7);
    assert.ok(box.screen.x + box.screen.w <= box.viewport.x + box.viewport.w + 1e-7);
    assert.ok(box.screen.y + box.screen.h <= box.viewport.y + box.viewport.h + 1e-7);
  }
});

test("target picking maps the visible source corners and rejects device chrome for every model", () => {
  for (const model of DEVICE_MOCKUPS) for (const [width, height] of [[1280, 720], [720, 1280]]) {
    const recording = { ...settings, deviceMockup: model.id };
    const box = recordingFrame(width, height, recording);
    for (const x of [0, .3, 1]) for (const y of [0, .7, 1]) {
      const target = recordingTarget((box.left + x * box.videoWidth) / 2, (box.top + y * box.videoHeight) / 2, width / 2, height / 2, width, height, recording)!;
      assert.ok(Math.abs(target.x - x) < 1e-7 && Math.abs(target.y - y) < 1e-7);
    }
    assert.equal(recordingTarget(0, 0, width, height, width, height, recording), null);
    assert.ok(RecordingSettingsSchema.safeParse(recording).success);
  }
  assert.equal(RecordingSettingsSchema.safeParse({ ...settings, deviceMockup: "unknown" }).success, false);
});

test("device selection is validated, versioned globally, and preserves scene content", () => {
  const graph: SceneGraph = { schema: 1, energy: "balanced", logoEmphasis: false, musicTrackId: null, bpm: 120, scenes: [] };
  assert.equal(isQuickSetting({ kind: "deviceMockup", value: "unknown" }), false);
  for (const model of DEVICE_MOCKUPS) {
    const setting = { kind: "deviceMockup" as const, value: model.id };
    assert.equal(isQuickSetting(setting), true);
    const next = applyQuickSetting(graph, setting);
    assert.equal(next.deviceMockup, model.id);
    assert.deepEqual(next.scenes, graph.scenes);
    assert.equal(graph.deviceMockup, undefined);
  }
});
