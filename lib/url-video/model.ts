import { z } from "zod";
import { uploadedFileSchema } from "../projects/validation";
import { VIDEO_STYLES } from "../../config/styles";
import { getLogoMotion } from "../../config/logo-motion";
import { getTrack } from "../../config/music";

export { ProductBriefSchema, type ProductBrief } from "./brief";
import { ProductBriefSchema, type ProductBrief } from "./brief";
export const UrlPreferencesSchema = z.object({
  templateId: z.string().max(40).refine((id) => VIDEO_STYLES.some((s) => s.id === id) && !getLogoMotion(id)).nullable().default(null),
  music: uploadedFileSchema.refine((file) => file.url.includes("/audio/") && file.mimeType.startsWith("audio/")).nullable().default(null),
  musicTrackId: z.string().max(100).refine((id) => Boolean(getTrack(id))).nullable().optional(),
});
export type UrlPreferences = z.infer<typeof UrlPreferencesSchema>;
export const ScreenSchema = uploadedFileSchema.extend({ label: z.string().max(120), source: z.string().max(2000), format: z.enum(["desktop", "mobile", "app"]) });
export const UrlAnalysisSchema = z.object({
  url: z.url().max(2000), locale: z.enum(["fr", "en"]), brief: ProductBriefSchema,
  colors: z.array(z.string().regex(/^#[a-f\d]{6}$/i)).min(1).max(6),
  logo: uploadedFileSchema.nullable(), screens: z.array(ScreenSchema).min(1).max(16),
  stores: z.array(z.object({ platform: z.enum(["ios", "android"]), url: z.url().max(2000) })).max(2),
  pages: z.array(z.string().max(2000)).max(5),
  preferences: UrlPreferencesSchema.optional(),
});
export type UrlAnalysis = z.infer<typeof UrlAnalysisSchema>;
export const ExtractedSourceSchema = UrlAnalysisSchema.omit({ locale: true, brief: true, preferences: true }).extend({
  text: z.string().max(55_000), fonts: z.array(z.string()), variables: z.array(z.string()),
  logoColors: z.array(z.string()), warnings: z.array(z.string()),
});
export const ExtractedDraftSchema = z.object({ state: z.literal("extracted"), locale: z.enum(["fr", "en"]), source: ExtractedSourceSchema, preferences: UrlPreferencesSchema.optional() });
export type ExtractedSource = z.infer<typeof ExtractedSourceSchema>;
export const ReviewSchema = z.object({
  analysisId: z.string().min(1).max(100), brief: ProductBriefSchema,
  colors: UrlAnalysisSchema.shape.colors, logo: uploadedFileSchema.nullable(),
  screens: z.array(uploadedFileSchema).min(1).max(8),
  format: z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]), duration: z.union([z.literal(10), z.literal(15), z.literal(30)]),
  saveBrand: z.boolean(),
  ...UrlPreferencesSchema.shape,
});
export type UrlReview = z.infer<typeof ReviewSchema>;

export function productGenerationBrief(brief: ProductBrief) {
  return JSON.stringify({ product: brief.product, audience: brief.audience, benefits: brief.benefits, tone: brief.tone, hook: brief.hooks[0] });
}

export function keyPages(links: { url: string; text: string }[], home: string) {
  const origin = new URL(home).origin;
  const seen = new Set([new URL(home).pathname.replace(/\/$/, "")]);
  return links.flatMap((link) => {
    try {
      const url = new URL(link.url, home);
      const path = url.pathname.replace(/\/$/, "");
      if (url.origin !== origin || url.search || seen.has(path) || !/feature|pricing|product|solution|fonction|tarif|produit/i.test(`${path} ${link.text}`)) return [];
      seen.add(path); url.hash = "";
      return [url.href];
    } catch { return []; }
  }).slice(0, 2);
}

export function storeLinks(links: { url: string }[]) {
  const found: UrlAnalysis["stores"] = [];
  for (const link of links) {
    try {
      const url = new URL(link.url);
      const platform = url.hostname === "apps.apple.com" && /\/id\d+/.test(url.pathname) ? "ios"
        : url.hostname === "play.google.com" && url.pathname === "/store/apps/details" && url.searchParams.has("id") ? "android" : null;
      if (platform && !found.some((item) => item.platform === platform)) found.push({ platform, url: url.href });
    } catch { /* Ignore malformed external links. */ }
  }
  return found;
}
