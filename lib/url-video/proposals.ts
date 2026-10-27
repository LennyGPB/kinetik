import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { generateVideo, welcomeMessage } from "../services/ai";
import { getVideoSource } from "../projects/queries";
import { parseSceneGraph } from "../projects/scenes";
import { claimGeneration, getCreditBalance, refundCredits, spendCredits } from "../credits/ledger";
import { acquireLock, releaseLock } from "../rate-limit";
import { CREDIT_COSTS } from "../../config/credits";
import { getPlan } from "../../config/pricing";
import { getTrack } from "../../config/music";
import { isOwnUpload } from "../storage";
import { productGenerationBrief, ReviewSchema, UrlAnalysisSchema, type UrlReview } from "./model";
import type { AiCaller } from "../security/ai-guard";
import type { Prisma } from "../generated/prisma/client";

/** The URL flow creates a single video. */
export const URL_VIDEO_COUNT = 1;

export async function urlVideoResult(id: string, caller: AiCaller) {
  const row = await db.urlVideoAnalysis.findFirst({ where: { id, userId: caller.userId } });
  if (!row) return null;
  const analysis = UrlAnalysisSchema.safeParse(row.data);
  if (!analysis.success) return null;
  const proposals = [];
  for (const [index, projectId] of row.projectIds.entries()) {
    let project = await db.project.findFirst({ where: { id: projectId, userId: caller.userId }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (!project) continue;
    if (!row.settledProjectIds.includes(projectId) && project.status === "GENERATING" && Date.now() - project.updatedAt.getTime() > 360_000) {
      // A terminated serverless invocation cannot leave a charged, permanently spinning proposal.
      await refundCredits(caller.userId, { amount: CREDIT_COSTS.generation, reference: projectId, description: "URL video · interrupted generation" });
      project = await db.project.update({ where: { id: projectId }, data: { status: "FAILED" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    }
    if (!row.settledProjectIds.includes(projectId) && ["READY", "FAILED"].includes(project.status)) await db.urlVideoAnalysis.update({ where: { id: row.id }, data: { settledProjectIds: { push: projectId } } });
    const source = project.status === "READY" ? await getVideoSource(project.id) : null;
    proposals.push({ id: project.id, index, status: project.status, styleId: project.styleId, source,
      graph: project.status === "READY" && project.versions[0] ? parseSceneGraph(project.versions[0].scenes) : null });
  }
  return { analysisId: row.id, analysis: analysis.data, review: ReviewSchema.safeParse((row.data as Record<string, unknown>).review).data ?? null,
    proposals, occupiedSlots: row.projectIds.length, balance: (await getCreditBalance(caller.userId)).total, watermark: getPlan(caller.plan).watermark };
}

async function saveBrand(userId: string, review: UrlReview, sourceUrl: string, tx: Prisma.TransactionClient) {
  const existing = await tx.brandKit.findFirst({ where: { userId, sourceUrl }, select: { id: true } });
  const data = { name: review.brief.company, sourceUrl, colors: review.colors, headingFont: review.brief.headingFont, bodyFont: review.brief.bodyFont, brief: review.brief as unknown as Prisma.InputJsonValue };
  const kit = existing ? await tx.brandKit.update({ where: { id: existing.id }, data })
    : await tx.brandKit.create({ data: { ...data, userId, isDefault: !await tx.brandKit.count({ where: { userId } }) } });
  await tx.brandKit.updateMany({ where: { userId, id: { not: kit.id } }, data: { isDefault: false } });
  await tx.brandKit.update({ where: { id: kit.id }, data: { isDefault: true } });
  await tx.asset.deleteMany({ where: { brandKitId: kit.id, type: { in: ["LOGO", "SCREEN"] } } });
  await tx.asset.createMany({ data: [...(review.logo ? [{ ...review.logo, type: "LOGO" as const, brandKitId: kit.id }] : []), ...review.screens.map((file, position) => ({ ...file, type: "SCREEN" as const, brandKitId: kit.id, position }))] });
}

export async function generateUrlProposals(review: UrlReview, caller: AiCaller, send: (event: Record<string, unknown>) => void) {
  const row = await db.urlVideoAnalysis.findFirst({ where: { id: review.analysisId, userId: caller.userId } });
  if (!row) throw new Error("not_found");
  const analysis = UrlAnalysisSchema.parse(row.data);
  // The user always picks the template; the AI only writes the message.
  const styleId = review.templateId;
  if (!styleId) throw new Error("invalid");
  if (![review.logo, review.music, ...review.screens].every((f) => !f || isOwnUpload(caller.userId, f.url))) throw new Error("invalid");
  const savedReview = ReviewSchema.safeParse((row.data as Record<string, unknown>).review).data;
  // Once a batch has begun it is immutable: retries resume the same paid operation.
  if (row.projectIds.length && JSON.stringify(savedReview) !== JSON.stringify(review)) throw new Error("review_locked");
  const remaining = Math.max(0, URL_VIDEO_COUNT - row.projectIds.length);
  if ((await getCreditBalance(caller.userId)).total < remaining * CREDIT_COSTS.generation) throw new Error("insufficient_credits");
  await db.$transaction(async (tx) => {
    await tx.urlVideoAnalysis.update({ where: { id: row.id }, data: { data: { ...analysis, review } as unknown as Prisma.InputJsonValue } });
    if (review.saveBrand) await saveBrand(caller.userId, review, analysis.url, tx);
  });
  const jobs: Promise<void>[] = [];
  const failures: unknown[] = [];
  try {
  for (let index = row.projectIds.length; index < URL_VIDEO_COUNT; index++) {
    const projectId = randomUUID();
    const track = review.music ? null : getTrack(review.musicTrackId);
    const context = { appName: review.brief.company, videoType: "presentation", locale: analysis.locale, interfaceLocale: analysis.locale,
      duration: review.duration, format: review.format, styleId, colors: review.colors,
      brief: productGenerationBrief(review.brief), websiteUrl: analysis.url, logoUrl: review.logo?.url ?? null,
      screenUrls: review.screens.map((s) => s.url), musicTrackId: review.music ? null : review.musicTrackId ?? null,
      musicTempo: review.music?.bpm ? { bpm: review.music.bpm, beatOffset: review.music.beatOffset ?? 0 } : track ? { bpm: track.bpm, beatOffset: track.beatOffset } : null, noMusic: !review.music && !track };
    // Share the editor's lock and durable execution receipt: an editor opened mid-batch cannot replay the call.
    const lock = await acquireLock(`generate:${projectId}`, 180_000, true);
    if (!lock) throw new Error("busy");
    try {
      // Link the debit, project and batch slot in one transaction before invoking any paid model.
      await spendCredits(caller.userId, { amount: CREDIT_COSTS.generation, type: "GENERATION", reference: projectId, description: `URL video · ${review.brief.company}` }, async (tx) => {
      await tx.project.create({ data: { id: projectId, userId: caller.userId, kind: "MOTION", name: review.brief.company, appName: context.appName,
        status: "GENERATING", locale: analysis.locale, duration: context.duration, format: context.format, videoType: "presentation", styleId: context.styleId, colors: context.colors,
        brief: context.brief, websiteUrl: analysis.url, assets: { create: [...(review.logo ? [{ ...review.logo, type: "LOGO" as const }] : []), ...(review.music ? [{ ...review.music, type: "MUSIC" as const }] : []), ...review.screens.map((s, position) => ({ ...s, type: "SCREEN" as const, position }))] } } });
      await tx.urlVideoAnalysis.update({ where: { id: row.id }, data: { projectIds: { push: projectId } } });
      });
    } catch (error) { await releaseLock(`generate:${projectId}`, lock); throw error; }
    jobs.push((async () => {
    try {
      const claim = await claimGeneration(caller.userId, projectId);
      if (!claim?.claimed) throw new Error("generation_claim_failed");
      send({ type: "progress", stage: "proposal", count: index + 1 });
      send({ type: "result", ...await urlVideoResult(row.id, caller) });
      const graph = { ...await generateVideo(context, caller.userId, caller.plan), musicTrackId: context.musicTrackId,
        ...(context.musicTempo && { bpm: context.musicTempo.bpm, beatOffset: context.musicTempo.beatOffset }),
        fonts: { heading: review.brief.headingFont, body: review.brief.bodyFont } };
      await db.$transaction([
        db.projectVersion.create({ data: { projectId, number: 1, label: analysis.locale === "fr" ? "Vidéo depuis l’URL" : "Video from URL", scenes: graph as unknown as Prisma.InputJsonValue } }),
        db.project.update({ where: { id: projectId }, data: { status: "READY" } }),
        db.chatMessage.create({ data: { projectId, role: "ASSISTANT", content: welcomeMessage(context.appName, analysis.locale) } }),
      ]);
    } catch {
      await refundCredits(caller.userId, { amount: CREDIT_COSTS.generation, reference: projectId, description: "URL video · failed generation" });
      await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
    } finally { await releaseLock(`generate:${projectId}`, lock); }
    send({ type: "result", ...await urlVideoResult(row.id, caller) });
    })().catch((error) => { failures.push(error); }));
  }
  } finally { await Promise.all(jobs); }
  if (failures.length) throw failures[0];
  send({ type: "complete", ...await urlVideoResult(row.id, caller) });
}
