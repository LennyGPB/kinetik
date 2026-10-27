import { ProductBriefSchema, ReviewSchema, UrlPreferencesSchema, type UrlAnalysis, type UrlPreferences, type UrlReview } from "./model";

export function normalizeSiteUrl(input: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error("invalid_url"); }
}

export function reviewFromAnalysis(id: string, analysis: UrlAnalysis, preferences: UrlPreferences = UrlPreferencesSchema.parse(analysis.preferences ?? {})): UrlReview {
  return ReviewSchema.parse({ analysisId: id, brief: analysis.brief, colors: analysis.colors, logo: analysis.logo,
    screens: analysis.screens.slice(0, 6), format: "PORTRAIT", duration: 15, saveBrand: true, ...preferences });
}

export function validUrlStep(step: number, review: UrlReview | null, preferences: UrlPreferences) {
  if (step === 1) return Boolean(review) && Boolean(preferences.templateId);
  if (!review) return false;
  if (step === 2) return ProductBriefSchema.safeParse(review.brief).success;
  if (step === 3) return review.screens.length > 0 && review.screens.length <= 8 && review.colors.length > 0;
  return Boolean(review.templateId) && ReviewSchema.safeParse(review).success;
}
