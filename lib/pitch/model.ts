import { z } from "zod";
import { BRAND_FONTS } from "../../config/fonts";
import type { SceneGraph } from "../projects/scenes";

export const PITCH_DURATIONS = [30, 60, 90, 120] as const;
export const CropSchema = z.object({ page: z.number().int().min(1).max(20), x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.01).max(1), height: z.number().min(0.01).max(1) }).refine((c) => c.x + c.width <= 1.01 && c.y + c.height <= 1.01);
export const ChartSchema = z.object({ type: z.enum(["bar", "line"]), unit: z.string().max(20), points: z.array(z.object({ label: z.string().max(24), value: z.number().finite().nonnegative() })).min(2).max(8), evidence: z.string().min(1).max(400) });
export const PitchSceneSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/), role: z.enum(["intro", "problem", "solution", "traction", "team", "cta"]),
  title: z.string().min(1).max(80), subtitle: z.string().max(160), narration: z.string().max(800), duration: z.number().min(2).max(20),
  visual: z.enum(["type", "counter", "chart", "mockup"]), metric: z.string().max(50).nullable(), chart: ChartSchema.nullable(), crop: CropSchema.nullable(),
  source: z.string().min(1).max(160), evidence: z.string().max(400),
});
export const PitchPlanSchema = z.object({
  company: z.string().min(1).max(40), summary: z.string().min(1).max(500),
  brand: z.object({ colors: z.array(z.string().regex(/^#[a-fA-F0-9]{6}$/)).min(2).max(4), detectedHeading: z.string().max(100), detectedBody: z.string().max(100), heading: z.enum(BRAND_FONTS), body: z.enum(BRAND_FONTS), fontNote: z.string().max(600), logoCrop: CropSchema.nullable() }),
  scenes: z.array(PitchSceneSchema).min(5).max(8), warnings: z.array(z.string().max(240)).max(8),
});
export const PitchOptionsSchema = z.object({ duration: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]), tone: z.enum(["investors", "customers", "social"]), locale: z.enum(["fr", "en"]), format: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]) });
export type PitchPlan = z.infer<typeof PitchPlanSchema>;
export type PitchOptions = z.infer<typeof PitchOptionsSchema>;
export type PitchChart = z.infer<typeof ChartSchema>;
export type PitchCrop = z.infer<typeof CropSchema>;
export type PitchMetadata = { state: "analyzing" | "review" | "ready" | "failed"; sourceName: string; sourceType: "pdf" | "website"; options: PitchOptions; plan?: PitchPlan; pages?: number; inputTokens?: number; outputTokens?: number };

/** Exact 30–120 s allocation, independent of slide count, bounded at 20 s per scene. */
export function pitchDurations(count: number, seconds: number): number[] {
  if (count < 5 || count > 8 || seconds < 30 || seconds > 120 || count * 20 < seconds) throw new Error("invalid_pitch_duration");
  const frames = Math.round(seconds * 30), base = Math.floor(frames / count);
  return Array.from({ length: count }, (_, i) => (base + (i < frames % count ? 1 : 0)) / 30);
}

export function normalizePitchPlan(value: unknown, options: PitchOptions, pages: number): PitchPlan {
  const shape = z.object({ scenes: z.array(z.unknown()) }).safeParse(value);
  if (shape.success && shape.data.scenes.length < 5) throw new Error("insufficient_content");
  const plan = PitchPlanSchema.parse(value);
  if (new Set(plan.scenes.map((s) => s.id)).size !== plan.scenes.length || plan.scenes[0].role !== "intro" || plan.scenes.at(-1)!.role !== "cta") throw new Error("invalid_pitch_plan");
  if (options.duration > plan.scenes.length * 20) throw new Error("invalid_pitch_duration");
  const durations = pitchDurations(plan.scenes.length, options.duration);
  for (const [index, scene] of plan.scenes.entries()) {
    scene.duration = durations[index];
    if (scene.crop && scene.crop.page > pages || scene.chart && !scene.chart.evidence.trim()) throw new Error("invalid_pitch_source");
    if (scene.visual === "chart" && !scene.chart || scene.visual === "counter" && !scene.metric || scene.visual === "mockup" && !scene.crop) throw new Error("invalid_pitch_visual");
  }
  if (plan.brand.logoCrop && plan.brand.logoCrop.page > pages) throw new Error("invalid_pitch_source");
  return plan;
}

export function pitchGraph(plan: PitchPlan, metadata: PitchMetadata, screenUrls: Record<string, string>, music: { id: string; bpm: number; beatOffset: number } | null): SceneGraph {
  return { schema: 1, language: metadata.options.locale, energy: metadata.options.tone === "social" ? "high" : "balanced", logoEmphasis: true,
    styleId: "veil", colors: plan.brand.colors, fonts: { heading: plan.brand.heading, body: plan.brand.body }, logoBackground: false,
    musicTrackId: music?.id ?? null, bpm: music?.bpm ?? 120, beatOffset: music?.beatOffset ?? 0, audio: { volume: 0.25, trimStart: 0, fadeIn: true, fadeOut: true },
    pitch: { ...metadata, state: "ready", plan }, scenes: plan.scenes.map((s) => ({
      id: s.id, kind: s.visual === "counter" ? "stat" : s.visual === "mockup" && screenUrls[s.id] ? "screens" : s.role === "intro" ? "intro" : s.role === "cta" ? "cta" : "feature",
      title: s.visual === "counter" ? s.metric! : s.title, subtitle: s.visual === "counter" ? `${s.title}${s.subtitle ? ` · ${s.subtitle}` : ""}` : s.subtitle,
      duration: s.duration, transition: "fade", presentation: s.role === "intro" || s.role === "cta" ? "editorial" : undefined,
      ...(screenUrls[s.id] && { screens: [screenUrls[s.id]], screenFrame: "browser" as const, screenCount: 1 }),
      pitchVisual: { source: s.source, evidence: s.evidence, ...(s.visual === "chart" && s.chart && { chart: s.chart }) },
    })) };
}

export function attachPitchVoice(graph: SceneGraph, plan: PitchPlan, voiceId: string): SceneGraph {
  return { ...graph, voiceover: { enabled: true, voiceId, language: graph.language ?? "fr", volume: 1, duckMusic: true, autoFit: true, captions: true,
    segments: graph.scenes.map((scene) => ({ sceneId: scene.id, text: plan.scenes.find((s) => s.id === scene.id)?.narration ?? "" })) } };
}
