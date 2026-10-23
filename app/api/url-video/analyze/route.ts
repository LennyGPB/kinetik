import { getCurrentUser } from "@/lib/auth/dal";
import { boundedJson } from "@/lib/security/request-body";
import { acquireLock, releaseLock, rateLimitAll } from "@/lib/rate-limit";
import { publicUrl } from "@/lib/capture/public-url";
import { db } from "@/lib/db";
import { extractUrlProduct } from "@/lib/url-video/extract";
import { analyzeUrlProduct } from "@/lib/url-video/analyze";
import { ExtractedDraftSchema, ExtractedSourceSchema, UrlAnalysisSchema, UrlPreferencesSchema } from "@/lib/url-video/model";
import { isOwnUpload } from "@/lib/storage";
import { analysisError } from "@/lib/url-video/errors";
import { eventStream } from "@/lib/url-video/stream";
import type { Prisma } from "@/lib/generated/prisma/client";

export const maxDuration = 300;
const active = new Set<string>();

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (typeof db.urlVideoAnalysis?.findFirst !== "function") return Response.json({ error: "prisma_client_stale" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 100) return Response.json({ error: "invalid" }, { status: 400 });
  const row = await db.urlVideoAnalysis.findFirst({ where: { id, userId: user.id } });
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  const draft = ExtractedDraftSchema.safeParse(row.data);
  return Response.json({ pending: draft.success, ...(draft.success && { url: draft.data.source.url, preferences: draft.data.preferences }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (typeof db.urlVideoAnalysis?.findFirst !== "function") return Response.json({ error: "prisma_client_stale" }, { status: 503 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await boundedJson(request, 8192).catch(() => null);
  if (typeof body?.analysisId !== "string" || body.analysisId.length > 100) return Response.json({ error: "invalid" }, { status: 400 });
  const preferences = UrlPreferencesSchema.safeParse(body.preferences);
  if (!preferences.success || (preferences.data.music && !isOwnUpload(user.id, preferences.data.music.url))) return Response.json({ error: "invalid" }, { status: 400 });
  const lock = await acquireLock(`url-video:${user.id}`, 330_000, true);
  if (!lock) return Response.json({ error: "busy" }, { status: 409 });
  const generationLock = await acquireLock(`url-video:generate:${user.id}`, 330_000, true);
  if (!generationLock) { await releaseLock(`url-video:${user.id}`, lock); return Response.json({ error: "busy" }, { status: 409 }); }
  try {
    const row = await db.urlVideoAnalysis.findFirst({ where: { id: body.analysisId, userId: user.id } });
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });
    if (row.projectIds.length) return Response.json({ error: "review_locked" }, { status: 409 });
    await db.urlVideoAnalysis.update({ where: { id: row.id }, data: { data: { ...(row.data as Record<string, Prisma.InputJsonValue>), preferences: preferences.data } as unknown as Prisma.InputJsonValue } });
    return Response.json({ ok: true });
  } finally { await releaseLock(`url-video:generate:${user.id}`, generationLock); await releaseLock(`url-video:${user.id}`, lock); }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  // Fail before capturing or calling the model when dev still holds a pre-generation Prisma client.
  if (typeof db.urlVideoAnalysis?.create !== "function") return Response.json({ error: "prisma_client_stale" }, { status: 503 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await boundedJson(request, 8192).catch(() => null);
  let existing: Awaited<ReturnType<typeof db.urlVideoAnalysis.findFirst>> = null;
  if (typeof body?.analysisId === "string" && body.analysisId.length <= 100) {
    existing = await db.urlVideoAnalysis.findFirst({ where: { id: body.analysisId, userId: user.id } });
    if (!existing) return Response.json({ error: "not_found" }, { status: 404 });
  } else {
    try { if (typeof body?.url !== "string" || body.url.length > 2000) throw new Error(); publicUrl(body.url); } catch { return Response.json({ error: "invalid_url" }, { status: 400 }); }
  }
  if (body.locale !== "fr" && body.locale !== "en") return Response.json({ error: "invalid" }, { status: 400 });
  const preferences = UrlPreferencesSchema.safeParse(body.preferences ?? (existing?.data as Record<string, unknown> | undefined)?.preferences ?? {});
  if (!preferences.success || (preferences.data.music && !isOwnUpload(user.id, preferences.data.music.url))) return Response.json({ error: "invalid" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ai_unavailable" }, { status: 503 });
  if (active.size >= 2 || !(await rateLimitAll([
    [`url-video:analyze:${user.id}`, { limit: 4, windowMs: 3_600_000, strict: true }],
    ["url-video:analyze:global", { limit: 60, windowMs: 86_400_000, strict: true }],
  ])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  const lock = await acquireLock(`url-video:${user.id}`, 330_000, true);
  if (!lock) return Response.json({ error: "busy" }, { status: 409 });
  active.add(user.id);
  return eventStream(async (send) => {
    let stage: "capture" | "brief" | "storage" = "capture";
    try {
      const completed = UrlAnalysisSchema.safeParse(existing?.data);
      if (existing && completed.success) { send({ type: "complete", analysisId: existing.id, analysis: completed.data }); return; }
      const draft = ExtractedDraftSchema.safeParse(existing?.data);
      if (existing && !draft.success) throw new Error("invalid_draft");
      const locale = draft.success ? draft.data.locale : body.locale;
      if (!draft.success) send({ type: "progress", stage: "website" });
      const extracted = draft.success ? draft.data.source : ExtractedSourceSchema.parse(await extractUrlProduct(body.url, user.id, (stage, count) => send({ type: "progress", stage, count }), request.signal));
      stage = "storage";
      const row = existing ?? await db.urlVideoAnalysis.create({ data: { userId: user.id, data: { state: "extracted", locale, source: extracted, preferences: preferences.data } as unknown as Prisma.InputJsonValue } });
      if (existing) await db.urlVideoAnalysis.update({ where: { id: row.id }, data: { data: { state: "extracted", locale, source: extracted, preferences: preferences.data } as unknown as Prisma.InputJsonValue } });
      send({ type: "extracted", analysisId: row.id });
      stage = "brief";
      send({ type: "progress", stage: "brief" });
      const brief = await analyzeUrlProduct(extracted, locale, { userId: user.id, plan: user.plan });
      const partial = locale === "fr" ? "Certaines captures ou pages n’ont pas pu être récupérées. Vérifie les visuels retenus." : "Some screenshots or pages could not be retrieved. Review the selected visuals.";
      stage = "storage";
      const analysis = UrlAnalysisSchema.parse({ ...extracted, locale, preferences: preferences.data, brief: { ...brief, warnings: [...brief.warnings, ...(extracted.warnings.length ? [partial] : [])].slice(0, 10) } });
      await db.urlVideoAnalysis.update({ where: { id: row.id }, data: { data: analysis as unknown as Prisma.InputJsonValue } });
      send({ type: "complete", analysisId: row.id, analysis });
    } catch (error) {
      const failure = analysisError(error, stage);
      console.error("[url-video:analysis]", { code: failure.code, ...failure.diagnostic });
      send({ type: "error", error: failure.code });
    } finally { active.delete(user.id); await releaseLock(`url-video:${user.id}`, lock); }
  });
}
