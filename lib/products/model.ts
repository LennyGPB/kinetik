import { z } from "zod";
import { PRODUCT_TEMPLATES, isProduct3D } from "../../config/physical-product";
import { PRODUCT_GALLERY_TRANSITIONS } from "../../config/product-gallery-motion";
import { getTrack } from "../../config/music";
import { uploadedFileSchema } from "../projects/validation";
import type { SceneGraph } from "../projects/scenes";

export const PhysicalProductSchema = z.object({
  requestId: z.uuid(), name: z.string().trim().min(1).max(40),
  hook: z.string().trim().min(1).max(100), benefits: z.array(z.string().trim().min(1).max(140)).min(1).max(3),
  cta: z.string().trim().min(1).max(80), price: z.string().trim().max(40),
  websiteUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(2000)]),
  saveBrand: z.boolean().default(true),
  templateId: z.enum(PRODUCT_TEMPLATES.map((item) => item.id)),
  images: z.array(uploadedFileSchema.refine((f) => f.mimeType.startsWith("image/") && f.url.includes("/image/"))).min(1).max(4),
  originals: z.array(uploadedFileSchema.refine((f) => f.mimeType.startsWith("image/") && f.url.includes("/image/"))).max(4).default([]),
  logo: uploadedFileSchema.refine((f) => f.mimeType.startsWith("image/") && f.url.includes("/image/")).nullable().default(null),
  colors: z.tuple([z.string().regex(/^#[\da-fA-F]{6}$/), z.string().regex(/^#[\da-fA-F]{6}$/), z.string().regex(/^#[\da-fA-F]{6}$/)]),
  format: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]), duration: z.union([z.literal(15), z.literal(30)]),
  locale: z.enum(["fr", "en"]), musicTrackId: z.string().max(100).refine((id) => Boolean(getTrack(id))).nullable(),
  music: uploadedFileSchema.refine((f) => f.mimeType.startsWith("audio/") && f.url.includes("/audio/")).nullable(),
});
export type PhysicalProductInput = z.input<typeof PhysicalProductSchema>;
export function physicalProductGraph(input: PhysicalProductInput): SceneGraph {
  const track = input.music ? null : getTrack(input.musicTrackId);
  const texts = [input.hook, ...input.benefits, input.cta];
  return { schema: 1, language: input.locale, styleId: input.templateId, colors: input.colors, energy: "calm", logoEmphasis: false, screenFrame: "none", musicTrackId: track?.id ?? null, bpm: track?.bpm ?? input.music?.bpm ?? 100, beatOffset: track?.beatOffset ?? input.music?.beatOffset ?? 0,
    scenes: texts.map((title, index) => ({ id: `product-${index}`, kind: index === 0 ? "intro" : index === texts.length - 1 ? "cta" : "feature", title, subtitle: index === texts.length - 1 ? input.price : input.name, duration: input.duration / texts.length, transition: isProduct3D(input.templateId) ? PRODUCT_GALLERY_TRANSITIONS[index % PRODUCT_GALLERY_TRANSITIONS.length] : "fade", screens: [input.images[index % input.images.length].url] })) };
}
