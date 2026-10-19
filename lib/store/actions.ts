"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CREDIT_COSTS, getStoreExportCost, getStoreGenerationCost } from "@/config/credits";
import { getPlan } from "@/config/pricing";
import { getStoreTemplate } from "@/config/store-templates";
import { spendCredits, refundCredits, getCreditBalance, InsufficientCreditsError } from "@/lib/credits/ledger";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload, storage } from "@/lib/storage";
import { uploadKey } from "@/lib/storage/keys";
import { projectMediaSchema } from "@/lib/projects/validation";
import { CreateStoreSchema } from "./validation";
import { StoreDocumentSchema, draftStore, type StoreDocument } from "./document";
import { writeStoreCopy } from "./ai";
import { storeBannerSvg, storeSvg } from "./svg";
import type { StoreVersion } from "./queries";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; required?: number; available?: number };
const failed = (error: unknown): Result<never> => error instanceof InsufficientCreditsError ? { ok: false, error: "insufficient_credits", required: error.required, available: error.available } : { ok: false, error: "ai_unavailable" };
async function limited(kind: "generation" | "setting" | "edit" | "export", userId: string) { return !(await limitKey(kind, userId, LIMITS[kind].map((rule) => ({ ...rule, strict: kind !== "setting" })))).ok; }
const usesMissingScreen = (document: StoreDocument, count: number) => document.pages.some((page) => [page.screen, page.screen2, page.android?.screen ?? null, page.android?.screen2 ?? null].some((index) => index !== null && index >= count));

export async function createStore(input: unknown): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = CreateStoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (![data.logo, ...data.screens].every((file) => !file || isOwnUpload(user.id, file.url))) return { ok: false, error: "invalid" };
  const key = `store-create:${user.id}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const existing = await db.project.findUnique({ where: { id: data.requestId }, select: { userId: true, status: true, kind: true } });
    if (existing) return existing.userId === user.id && existing.kind === "STORE" && existing.status === "READY" ? { ok: true, id: data.requestId } : { ok: false, error: "busy" };
    if (await limited("generation", user.id)) return { ok: false, error: "rate_limited" };
    const template = getStoreTemplate(data.templateId)!;
    const document: StoreDocument = { ...draftStore(template.id, data.locale, data.appName, data.screens.length, randomUUID), colors: data.colors as StoreDocument["colors"] };
    const cost = getStoreGenerationCost(document.pages.length);
    try {
      await spendCredits(user.id, { amount: cost, type: "GENERATION", reference: data.requestId, description: `Store · ${data.appName} · ${document.pages.length}` }, async (tx) => {
        await tx.project.create({ data: { id: data.requestId, userId: user.id, kind: "STORE", name: data.appName, appName: data.appName, locale: data.locale, brief: data.brief, status: "GENERATING", styleId: data.templateId, format: "PORTRAIT", duration: 0, colors: data.colors,
          versions: { create: { number: 1, label: data.locale === "fr" ? "Premier jet" : "First draft", scenes: document } },
          assets: { create: [...(data.logo ? [{ ...data.logo, type: "LOGO" as const }] : []), ...data.screens.map((file, position) => ({ ...file, type: "SCREEN" as const, position }))] },
        } });
      });
    } catch (error) { return failed(error); }
    try {
      const generated = StoreDocumentSchema.parse(await writeStoreCopy(document, data, { userId: user.id, plan: user.plan }));
      await db.$transaction([
        db.projectVersion.update({ where: { projectId_number: { projectId: data.requestId, number: 1 } }, data: { scenes: generated } }),
        db.project.update({ where: { id: data.requestId }, data: { status: "READY" } }),
      ]);
    } catch {
      await refundCredits(user.id, { amount: cost, reference: data.requestId, description: "Store · remboursement génération" });
      await db.project.update({ where: { id: data.requestId }, data: { status: "FAILED" } });
      return { ok: false, error: "ai_unavailable" };
    }
    refresh();
    return { ok: true, id: data.requestId };
  } finally { await releaseLock(key, lock); }
}

export async function saveStore(projectId: string, expectedVersion: number, value: unknown, label?: string, metadata?: unknown): Promise<Result<{ version: StoreVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = StoreDocumentSchema.safeParse(value);
  if (!parsed.success || !Number.isSafeInteger(expectedVersion)) return { ok: false, error: "invalid" };
  const meta = metadata === undefined ? null : projectMediaSchema.extend({ name: z.string().trim().min(1).max(60) }).safeParse(metadata);
  if (meta && (!meta.success || ![meta.data.logo, ...meta.data.screens].every((file) => !file || file.mimeType.startsWith("image/") && isOwnUpload(user.id, file.url)))) return { ok: false, error: "invalid" };
  if (await limited("setting", user.id)) return { ok: false, error: "rate_limited" };
  const key = `store:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "STORE", status: { in: ["READY", "FAILED"] } }, select: { id: true, locale: true, assets: { where: { type: "SCREEN" }, select: { id: true } } } });
    if (!project) return { ok: false, error: "not_found" };
    if (usesMissingScreen(parsed.data, meta?.success ? meta.data.screens.length : project.assets.length)) return { ok: false, error: "invalid" };
    const last = await db.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
    if (!last || last.number !== expectedVersion) return { ok: false, error: "conflict" };
    const version = await db.$transaction(async (tx) => {
      const version = await tx.projectVersion.create({ data: { projectId, number: last.number + 1, scenes: parsed.data, label: label?.slice(0, 80) || (project.locale === "fr" ? "Modification manuelle" : "Manual edit") } });
      await tx.project.update({ where: { id: projectId }, data: { status: "READY", styleId: parsed.data.templateId, colors: parsed.data.colors, updatedAt: new Date(), ...(meta?.success ? { name: meta.data.name } : {}) } });
      if (meta?.success) {
        await tx.asset.deleteMany({ where: { projectId, type: { in: ["LOGO", "SCREEN"] } } });
        await tx.asset.createMany({ data: [...(meta.data.logo ? [{ ...meta.data.logo, type: "LOGO" as const, projectId }] : []), ...meta.data.screens.map((file, position) => ({ ...file, type: "SCREEN" as const, projectId, position }))] });
      }
      return version;
    });
    refresh();
    return { ok: true, version: { id: version.id, number: version.number, label: version.label, document: parsed.data } };
  } finally { await releaseLock(key, lock); }
}

export async function editStoreWithAi(projectId: string, expectedVersion: number, instruction: string, requestId: string): Promise<Result<{ version: StoreVersion; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!z.uuid().safeParse(requestId).success || typeof instruction !== "string" || instruction.trim().length < 3 || instruction.length > 1500) return { ok: false, error: "invalid" };
  const key = `store:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  const reference = `store-edit:${requestId}`;
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "STORE", status: "READY" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (!project) return { ok: false, error: "not_found" };
    if (await db.creditTransaction.findFirst({ where: { userId: user.id, type: "EDIT", reference } })) {
      const completed = await db.projectVersion.findFirst({ where: { projectId, messageId: requestId } });
      if (completed) return { ok: true, version: { id: completed.id, number: completed.number, label: completed.label, document: StoreDocumentSchema.parse(completed.scenes) }, balance: (await getCreditBalance(user.id)).total };
      return { ok: false, error: "busy" };
    }
    if (project.versions[0]?.number !== expectedVersion) return { ok: false, error: "conflict" };
    if (await limited("edit", user.id)) return { ok: false, error: "rate_limited" };
    const current = StoreDocumentSchema.parse(project.versions[0].scenes);
    try { await spendCredits(user.id, { amount: CREDIT_COSTS.store.edit, type: "EDIT", reference, description: `Store · ${project.name}` }, async (tx) => { await tx.chatMessage.create({ data: { id: requestId, projectId, role: "USER", content: instruction.trim() } }); }); }
    catch (error) { return failed(error); }
    try {
      const document = StoreDocumentSchema.parse(await writeStoreCopy(current, { appName: project.appName, brief: project.brief ?? "", locale: project.locale, instruction: instruction.trim() }, { userId: user.id, plan: user.plan }));
      const version = await db.$transaction(async (tx) => {
        const version = await tx.projectVersion.create({ data: { projectId, number: expectedVersion + 1, label: instruction.slice(0, 80), scenes: document, messageId: requestId } });
        await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
        return version;
      });
      refresh();
      return { ok: true, version: { id: version.id, number: version.number, label: version.label, document }, balance: (await getCreditBalance(user.id)).total };
    } catch {
      await refundCredits(user.id, { amount: CREDIT_COSTS.store.edit, reference, description: "Store · remboursement modification" });
      return { ok: false, error: "ai_unavailable" };
    }
  } finally { await releaseLock(key, lock); }
}

/** Renders every page twice (iPhone 1320 × 2868, Android 1080 × 1920) plus the Play feature graphic, as flat RGB PNGs. */
export async function exportStore(projectId: string, expectedVersion: number, requestId: string): Promise<Result<{ id: string; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!z.uuid().safeParse(requestId).success) return { ok: false, error: "invalid" };
  const key = `store:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "STORE", status: "READY" }, include: { assets: { orderBy: { position: "asc" } }, versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (!project) return { ok: false, error: "not_found" };
    const existing = await db.postExport.findUnique({ where: { requestId } });
    if (existing) return existing.projectId === projectId && existing.status === "DONE" ? { ok: true, id: existing.id, balance: (await getCreditBalance(user.id)).total } : { ok: false, error: "busy" };
    const version = project.versions[0];
    if (!version || version.number !== expectedVersion) return { ok: false, error: "conflict" };
    if (await limited("export", user.id)) return { ok: false, error: "rate_limited" };
    if (!(await limitKey("post-export-global", "all", LIMITS.exportGlobal)).ok || user.plan === "FREE" && !(await limitKey("post-export-global", "free", LIMITS.exportGlobalFree)).ok) return { ok: false, error: "rate_limited" };
    const document = StoreDocumentSchema.parse(version.scenes);
    const reexport = Boolean(await db.postExport.findFirst({ where: { projectId, status: "DONE" }, select: { id: true } }));
    const cost = getStoreExportCost(document.pages.length, reexport);
    const exportId = randomUUID();
    try { await spendCredits(user.id, { amount: cost, type: "EXPORT", reference: exportId, description: `Store · ${project.name} · ${document.pages.length} × 2` }, async (tx) => {
      await tx.postExport.create({ data: { id: exportId, projectId, versionId: version.id, requestId, format: "store", creditCost: cost, status: "RENDERING" } });
    }); } catch (error) { return failed(error); }
    try {
      const embedded = new Map<string, string>();
      for (const asset of project.assets.filter((asset) => asset.type === "LOGO" || asset.type === "SCREEN")) {
        const assetKey = uploadKey(asset.url);
        if (!assetKey || !isOwnUpload(user.id, asset.url)) throw new Error("invalid_media");
        const bytes = await storage.get(assetKey);
        if (!bytes) throw new Error("missing_media");
        const png = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1400, height: 2800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        embedded.set(asset.url, `data:image/png;base64,${png.toString("base64")}`);
      }
      const logo = project.assets.find((asset) => asset.type === "LOGO");
      const media = { appName: project.appName, logoUrl: logo ? embedded.get(logo.url) : null, screenUrls: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => embedded.get(asset.url)!), watermark: getPlan(user.plan).watermark };
      const svgs = [...document.pages.map((_, i) => storeSvg(document, i, "ios", media)), ...document.pages.map((_, i) => storeSvg(document, i, "android", media)), storeBannerSvg(document, media)];
      const files: string[] = [];
      // Stores reject transparency: flatten to opaque RGB.
      for (const [i, svg] of svgs.entries()) {
        const data = await sharp(Buffer.from(svg)).flatten({ background: document.colors[0] }).png().toBuffer();
        const stored = await storage.put(new File([new Uint8Array(data)], `${String(i + 1).padStart(2, "0")}.png`, { type: "image/png" }), `${user.id}/image`);
        files.push(stored.url);
      }
      await db.postExport.update({ where: { id: exportId }, data: { status: "DONE", files } });
      return { ok: true, id: exportId, balance: (await getCreditBalance(user.id)).total };
    } catch {
      await refundCredits(user.id, { amount: cost, reference: exportId, description: "Store · remboursement export" });
      await db.postExport.update({ where: { id: exportId }, data: { status: "FAILED" } });
      return { ok: false, error: "render_failed" };
    }
  } finally { await releaseLock(key, lock); }
}
