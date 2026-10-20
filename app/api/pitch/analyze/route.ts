import { getCurrentUser } from "@/lib/auth/dal";
import { boundedFormData, PayloadTooLargeError } from "@/lib/security/request-body";
import { acquireLock, releaseLock, rateLimitAll } from "@/lib/rate-limit";
import { InsufficientCreditsError, refundCredits, spendCredits } from "@/lib/credits/ledger";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CREDIT_COSTS } from "@/config/credits";
import { PitchOptionsSchema, type PitchMetadata } from "@/lib/pitch/model";
import { downloadPitchSource } from "@/lib/pitch/download";
import { openPitchPdf, pdfCrop, pdfFontNames, cropImage } from "@/lib/pitch/pdf";
import { captureWebsite } from "@/lib/capture/website";
import { analyzePitch } from "@/lib/pitch/analyze";
import { parseSceneGraph } from "@/lib/projects/scenes";
import type { Prisma } from "@/lib/generated/prisma/client";

export const maxDuration = 300;
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await rateLimitAll([[`pitch:analyze:${user.id}`, { limit: 5, windowMs: 3_600_000, strict: true }]])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  if (!(await rateLimitAll([["pitch:global", { limit: 100, windowMs: 86_400_000, strict: true }], [`pitch:global:${user.plan}`, { limit: user.plan === "FREE" ? 30 : 100, windowMs: 86_400_000, strict: true }]])).ok) return Response.json({ error: "rate_limited" }, { status: 429 });
  const lock = await acquireLock(`pitch:${user.id}`, 330_000, true);
  if (!lock) return Response.json({ error: "busy" }, { status: 409 });
  let projectId = "", charged = false;
  let pdf: Awaited<ReturnType<typeof openPitchPdf>> | undefined;
  try {
    const form = await boundedFormData(request, 10 * 1024 * 1024 + 64_000);
    projectId = String(form.get("requestId") ?? "");
    if (!/^[a-f0-9-]{36}$/.test(projectId)) throw new Error("invalid");
    const options = PitchOptionsSchema.parse(JSON.parse(String(form.get("options"))));
    const existing = await db.project.findFirst({ where: { id: projectId, userId: user.id, videoType: "pitch-deck" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (existing) {
      const graph = parseSceneGraph(existing.versions[0]?.scenes);
      if (graph.pitch?.state === "review" || graph.pitch?.state === "ready") return Response.json({ projectId });
      if (graph.pitch?.state === "analyzing" && Date.now() - existing.createdAt.getTime() > 10 * 60_000) {
        await refundCredits(user.id, { amount: CREDIT_COSTS.pitch.analysis, reference: projectId, description: "Pitch · interrupted analysis" });
        await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
      }
      throw new Error("busy");
    }
    const file = form.get("file"), url = String(form.get("url") ?? "");
    let data: Buffer | undefined;
    let sourceType: "pdf" | "website" = "pdf";
    let sourceName = "Pitch deck";
    if (file instanceof File && file.size) { data = Buffer.from(await file.arrayBuffer()); sourceName = file.name.slice(0, 120); }
    else if (url) {
      const result = await downloadPitchSource(url);
      if (result.data.toString("ascii", 0, 5) === "%PDF-") { data = result.data; sourceName = new URL(url).pathname.split("/").at(-1)?.slice(0, 120) || "Pitch deck.pdf"; }
      else { sourceType = "website"; sourceName = new URL(url).hostname; }
    } else throw new Error("invalid");
    if (data) pdf = await openPitchPdf(data);
    const metadata: PitchMetadata = { state: "analyzing", sourceName, sourceType, options, pages: pdf?.numPages ?? 3 };
    await spendCredits(user.id, { amount: CREDIT_COSTS.pitch.analysis, type: "GENERATION", reference: projectId, description: "Pitch · source analysis" }, async (tx) => {
      await tx.project.create({ data: { id: projectId, userId: user.id, name: sourceName, appName: "Pitch deck", kind: "MOTION", videoType: "pitch-deck", locale: options.locale,
        status: "DRAFT", duration: options.duration, format: options.format, styleId: "veil", websiteUrl: sourceType === "website" ? url : null,
        versions: { create: { number: 1, label: "Pitch analysis", scenes: { schema: 1, energy: "balanced", logoEmphasis: true, musicTrackId: null, bpm: 120, scenes: [], pitch: metadata } as unknown as Prisma.InputJsonValue } } } });
    });
    charged = true;
    const website = sourceType === "website" ? await captureWebsite(url, "desktop", request.signal) : null;
    metadata.pages = pdf?.numPages ?? website!.images.length;
    const analysis = await analyzePitch({ ...(data && { pdf: data }), ...(pdf && { fonts: await pdfFontNames(pdf) }), ...(website && { text: website.content.text, fonts: website.content.fonts, images: website.images.map((i) => i.buffer) }), pages: metadata.pages }, options, { userId: user.id, plan: user.plan });
    const assets: Prisma.AssetCreateManyInput[] = [];
    const crops = [...(analysis.plan.brand.logoCrop ? [{ id: "logo", crop: analysis.plan.brand.logoCrop, type: "LOGO" as const }] : []), ...analysis.plan.scenes.filter((s) => s.crop && s.visual === "mockup").map((s) => ({ id: s.id, crop: s.crop!, type: "SCREEN" as const }))];
    for (const [position, item] of crops.entries()) {
      const image = pdf ? await pdfCrop(pdf, item.crop) : await cropImage(website!.images[item.crop.page - 1].buffer, item.crop);
      const file = new File([new Uint8Array(image.data)], `${item.id}.png`, { type: "image/png" });
      const stored = await storage.put(file, `${user.id}/image`);
      assets.push({ projectId, type: item.type, url: stored.url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, width: image.width, height: image.height, position });
    }
    metadata.state = "review"; metadata.plan = analysis.plan; metadata.inputTokens = analysis.inputTokens; metadata.outputTokens = analysis.outputTokens;
    await db.$transaction([
      db.asset.createMany({ data: assets }),
      db.projectVersion.update({ where: { projectId_number: { projectId, number: 1 } }, data: { scenes: { schema: 1, energy: "balanced", logoEmphasis: true, musicTrackId: null, bpm: 120, scenes: [], pitch: metadata } as unknown as Prisma.InputJsonValue } }),
      db.project.update({ where: { id: projectId }, data: { appName: analysis.plan.company, name: analysis.plan.company, colors: analysis.plan.brand.colors } }),
    ]);
    return Response.json({ projectId });
  } catch (error) {
    if (charged) { await refundCredits(user.id, { amount: CREDIT_COSTS.pitch.analysis, reference: projectId, description: "Pitch · failed analysis" }); await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } }); }
    const message = error instanceof InsufficientCreditsError ? "insufficient_credits" : error instanceof PayloadTooLargeError ? "source_too_large" : error instanceof Error ? error.message : "analysis_failed";
    const safe = ["insufficient_content", "insufficient_credits", "invalid", "busy", "invalid_url", "invalid_pdf", "pdf_page_limit", "source_too_large", "pitch_budget", "capture_timeout", "browser_unavailable"].includes(message) ? message : "analysis_failed";
    return Response.json({ error: safe }, { status: safe === "insufficient_credits" ? 402 : 400 });
  } finally { await pdf?.destroy().catch(() => {}); await releaseLock(`pitch:${user.id}`, lock); }
}
