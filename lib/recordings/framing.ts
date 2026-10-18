import type { RecordingSettings } from "./model";
import { deviceGeometry, deviceSpec } from "../../config/device-mockups";

/** Source content rectangle in composition pixels, excluding its decorative browser bar. */
export function recordingFrame(width: number, height: number, recording: RecordingSettings) {
  if (deviceSpec(recording.deviceMockup)) {
    const margin = Math.min(width, height) * Math.max(2, recording.padding) / 100;
    const device = deviceGeometry(recording.deviceMockup!, width - margin * 2, height - margin * 2, recording.width / recording.height);
    return { bar: 0, videoWidth: device.screen.w, videoHeight: device.screen.h, left: (width - device.w) / 2 + device.screen.x, top: (height - device.h) / 2 + device.screen.y, device };
  }
  const bar = recording.frame === "browser" ? Math.min(width, height) * 0.035 : 0;
  const margin = Math.min(width, height) * recording.padding / 100;
  const videoWidth = Math.min(width - margin * 2, (height - margin * 2 - bar) * recording.width / recording.height);
  const videoHeight = videoWidth * recording.height / recording.width;
  return { bar, videoWidth, videoHeight, left: (width - videoWidth) / 2, top: (height - videoHeight - bar) / 2 + bar };
}

export function recordingTarget(px: number, py: number, viewportWidth: number, viewportHeight: number, width: number, height: number, recording: RecordingSettings) {
  const scale = Math.min(viewportWidth / width, viewportHeight / height);
  if (!scale) return null;
  const source = recordingFrame(width, height, recording);
  const x = ((px - (viewportWidth - width * scale) / 2) / scale - source.left) / source.videoWidth;
  const y = ((py - (viewportHeight - height * scale) / 2) / scale - source.top) / source.videoHeight;
  return x >= -1e-8 && x <= 1 + 1e-8 && y >= -1e-8 && y <= 1 + 1e-8
    ? { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) } : null;
}
