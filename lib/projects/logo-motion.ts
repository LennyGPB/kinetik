import { z } from "zod";
import { LOGO_MOTION_IDS } from "../../config/logo-motion";
import { getTrack } from "../../config/music";
import type { SceneGraph } from "./scenes";

export const LogoMotionSchema = z.object({
  requestId: z.uuid(), text: z.string().trim().min(1).max(48), templateId: z.enum(LOGO_MOTION_IDS),
  format: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]), duration: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  colors: z.tuple([z.string().regex(/^#[\da-fA-F]{6}$/), z.string().regex(/^#[\da-fA-F]{6}$/), z.string().regex(/^#[\da-fA-F]{6}$/)]),
  musicTrackId: z.string().max(40).nullable(), locale: z.enum(["fr", "en"]),
}).refine((input) => input.musicTrackId === null || Boolean(getTrack(input.musicTrackId)), { path: ["musicTrackId"] });
export type LogoMotionInput = z.input<typeof LogoMotionSchema>;
/** Exact user copy: the first experiment never sends text through an AI generation step. */
export function logoMotionGraph(input: LogoMotionInput): SceneGraph {
  const track = input.musicTrackId ? getTrack(input.musicTrackId) : null;
  return { schema: 1, language: input.locale, energy: "balanced", logoEmphasis: false, screenFrame: "none", styleId: input.templateId, colors: [...input.colors], musicTrackId: track?.id ?? null, bpm: track?.bpm ?? 120, beatOffset: track?.beatOffset ?? 0,
    scenes: [{ id: "logo-word", kind: "intro", title: input.text.trim(), duration: input.duration, transition: "cut" }] };
}
