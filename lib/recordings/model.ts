import { z } from "zod";
import { DEVICE_MOCKUP_IDS } from "../../config/device-mockups";

export const RECORDING_MAX_BYTES = 30 * 1024 * 1024;
export const RECORDING_MAX_SECONDS = 120;
export const RECORDING_MOTIONS = ["none", "tilt-left", "tilt-right", "tilt-up", "orbit", "diagonal", "swing"] as const;
export function defaultRecordingMotion(index: number): (typeof RECORDING_MOTIONS)[number] {
  const motions = ["tilt-left", "tilt-right", "diagonal", "swing", "tilt-up"] as const;
  return motions[index % motions.length];
}
export const RecordingClickSchema = z.object({
  id: z.string().min(1).max(60),
  time: z.number().finite().min(0),
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});
export type RecordingClick = z.infer<typeof RecordingClickSchema>;
export const ZoomSchema = z.object({
  id: z.string().min(1).max(60),
  start: z.number().finite().min(0),
  end: z.number().finite().positive(),
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  scale: z.number().finite().min(1.2).max(2.5),
  motion: z.enum(RECORDING_MOTIONS).optional(),
});
export const RecordingSettingsSchema = z.object({
  duration: z.number().finite().min(1).max(RECORDING_MAX_SECONDS),
  width: z.number().int().min(16).max(7680),
  height: z.number().int().min(16).max(7680),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  padding: z.number().min(0).max(16),
  radius: z.number().min(0).max(40),
  frame: z.enum(["browser", "none"]),
  deviceMockup: z.enum(DEVICE_MOCKUP_IDS).optional(),
  originalAudio: z.boolean(),
  clicks: z.array(RecordingClickSchema).max(60).optional(),
  clickColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  clickEffects: z.boolean().optional(),
  zooms: z.array(ZoomSchema).max(30),
}).superRefine((value, ctx) => {
  const clickIds = new Set<string>();
  for (const click of value.clicks ?? []) {
    if (click.time >= value.duration || clickIds.has(click.id)) ctx.addIssue({ code: "custom", path: ["clicks"], message: "Invalid click" });
    clickIds.add(click.id);
  }
  const sorted = [...value.zooms].sort((a, b) => a.start - b.start);
  const ids = new Set<string>();
  sorted.forEach((zoom, i) => {
    if (ids.has(zoom.id) || zoom.end > value.duration || zoom.end - zoom.start < 0.6 - 1e-8 || (i > 0 && zoom.start < sorted[i - 1].end)) {
      ctx.addIssue({ code: "custom", path: ["zooms"], message: "Invalid or overlapping zooms" });
    }
    ids.add(zoom.id);
  });
});
export type RecordingSettings = z.infer<typeof RecordingSettingsSchema>;
export type RecordingZoom = z.infer<typeof ZoomSchema>;
export type ScreenRecording = RecordingSettings & { src: string };

export function clickPulse(time: number, clickTime: number) {
  const progress = (time - clickTime) / 0.55;
  if (progress < 0 || progress >= 1) return null;
  return { scale: 0.4 + 1.4 * (1 - (1 - progress) ** 3), opacity: Math.min(1, progress / 0.08) * (1 - progress) };
}

/** Smooth, deterministic camera shared by preview and export. Never expose an edge. */
export function recordingCamera(zooms: RecordingZoom[], seconds: number) {
  const zoom = zooms.find((item) => seconds >= item.start && seconds <= item.end);
  if (!zoom) return { scale: 1, x: 0, y: 0 };
  const ease = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
  const ramp = Math.min(0.65, (zoom.end - zoom.start) / 3);
  const amount = ease(Math.min((seconds - zoom.start) / ramp, (zoom.end - seconds) / ramp));
  const scale = 1 + (zoom.scale - 1) * amount;
  const limit = (scale - 1) / 2;
  return { scale, x: Math.max(-limit, Math.min(limit, (0.5 - zoom.x) * scale)), y: Math.max(-limit, Math.min(limit, (0.5 - zoom.y) * scale)) };
}

/** Whole-device motion follows the zoom envelope, independent of playback order. */
export function recordingTilt(zooms: RecordingZoom[], seconds: number) {
  const zoom = zooms.find((item) => seconds >= item.start && seconds <= item.end);
  if (!zoom?.motion || zoom.motion === "none") return { x: 0, y: 0 };
  const camera = recordingCamera([zoom], seconds);
  const amount = Math.max(0, Math.min(1, (camera.scale - 1) / (zoom.scale - 1)));
  const progress = (seconds - zoom.start) / (zoom.end - zoom.start);
  if (zoom.motion === "tilt-left") return { x: 0, y: -12 * amount };
  if (zoom.motion === "tilt-right") return { x: 0, y: 12 * amount };
  if (zoom.motion === "tilt-up") return { x: 10 * amount, y: 0 };
  if (zoom.motion === "diagonal") return { x: 8 * amount, y: -10 * amount, z: 3 * amount };
  if (zoom.motion === "swing") {
    const wave = Math.sin(progress * Math.PI * 2) * amount;
    return { x: 3 * wave, y: 12 * wave, z: -2 * wave };
  }
  return { x: Math.sin(progress * Math.PI * 2) * 8 * amount, y: Math.cos(progress * Math.PI * 2) * 12 * amount };
}

