"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CREDIT_COSTS, getPostGenerationCost, getPostExportCost } from "@/config/credits";
import { getPlan } from "@/config/pricing";
import { getPostTemplate, isActivePostTemplate } from "@/config/post-templates";
import { spendCredits, refundCredits, getCreditBalance, InsufficientCreditsError } from "@/lib/credits/ledger";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload, storage } from "@/lib/storage";
import { uploadKey } from "@/lib/storage/keys";
import { projectMediaSchema } from "@/lib/projects/validation";
import { CreatePostSchema } from "./validation";
import { PostDocumentSchema, demoPost, newPostPage, type PostDocument } from "./document";
import { writePostCopy } from "./ai";
import { postSvg } from "./svg";
import type { PostVersion } from "./queries";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; required?: number; available?: number };
const failed = (error: unknown): Result<never> => error instanceof InsufficientCreditsError ? { ok: false, error: "insufficient_credits", required: error.required, available: error.available } : { ok: false, error: "ai_unavailable" };
async function limited(kind: "generation" | "setting" | "edit" | "export" | "project", userId: string) { return !(await limitKey(kind, userId, LIMITS[kind].map((rule) => ({ ...rule, strict: ["generation", "edit", "export"].includes(kind) })))).ok; }

export async function createPost(input: unknown): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = CreatePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (![data.logo, ...data.screens].every((file) => !file || isOwnUpload(user.id, file.url))) return { ok: false, error: "invalid" };
  const key = `post-create:${user.id}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const existing = await db.project.findUnique({ where: { id: data.requestId }, select: { userId: true, status: true, kind: true } });
    if (existing) return existing.userId === user.id && existing.kind === "POST" && existing.status === "READY" ? { ok: true, id: data.requestId } : { ok: false, error: "busy" };
    if (await limited("generation", user.id)) return { ok: false, error: "rate_limited" };
    const template = getPostTemplate(data.templateId)!;
    const demo = demoPost(template.id, data.locale);
    const document: PostDocument = { ...demo, format: data.format, colors: data.colors as PostDocument["colors"], pages: Array.from({ length: data.pageCount }, (_, i) => ({ ...(demo.pages[i] ?? newPostPage(randomUUID(), "", demo.pages[0])), id: randomUUID(), imageIndex: data.screens.length ? i % data.screens.length : null, layout: data.screens.length ? "image" : "text", ...(demo.pages[0].members && { members: demo.pages[0].members.map((member, j) => ({ ...member, imageIndex: j < data.screens.length ? j : null })) }) })) };
    const cost = getPostGenerationCost(data.pageCount);
    try {
      await spendCredits(user.id, { amount: cost, type: "GENERATION", reference: data.requestId, description: `Instagram · ${data.appName} · ${data.pageCount}` }, async (tx) => {
        await tx.project.create({ data: { id: data.requestId, userId: user.id, kind: "POST", name: data.appName, appName: data.appName, locale: data.locale, brief: data.brief, status: "GENERATING", styleId: data.templateId, format: "SQUARE", duration: 0, colors: data.colors,
          versions: { create: { number: 1, label: data.locale === "fr" ? "Premier jet" : "First draft", scenes: document } },
          assets: { create: [...(data.logo ? [{ ...data.logo, type: "LOGO" as const }] : []), ...data.screens.map((file, position) => ({ ...file, type: "SCREEN" as const, position }))] },
        } });
      });
    } catch (error) { return failed(error); }
    try {
      const generated = PostDocumentSchema.parse(await writePostCopy(document, data, { userId: user.id, plan: user.plan }));
      await db.$transaction([
        db.projectVersion.update({ where: { projectId_number: { projectId: data.requestId, number: 1 } }, data: { scenes: generated } }),
        db.project.update({ where: { id: data.requestId }, data: { status: "READY" } }),
      ]);
    } catch {
      await refundCredits(user.id, { amount: cost, reference: data.requestId, description: `Instagram · remboursement génération` });
      await db.project.update({ where: { id: data.requestId }, data: { status: "FAILED" } });
      return { ok: false, error: "ai_unavailable" };
    }
    refresh();
    return { ok: true, id: data.requestId };
  } finally { await releaseLock(key, lock); }
}

export async function savePost(projectId: string, expectedVersion: number, value: unknown, label?: string, metadata?: unknown): Promise<Result<{ version: PostVersion }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = PostDocumentSchema.safeParse(value);
  if (!parsed.success || !Number.isSafeInteger(expectedVersion)) return { ok: false, error: "invalid" };
  const meta = metadata === undefined ? null : projectMediaSchema.extend({ name: z.string().trim().min(1).max(60) }).safeParse(metadata);
  if (meta && (!meta.success || ![meta.data.logo, ...meta.data.screens].every((file) => !file || file.mimeType.startsWith("image/") && isOwnUpload(user.id, file.url)))) return { ok: false, error: "invalid" };
  if (await limited("setting", user.id)) return { ok: false, error: "rate_limited" };
  const key = `post:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "POST", status: { in: ["READY", "FAILED"] } }, select: { id: true, locale: true, styleId: true, assets: { where: { type: "SCREEN" }, select: { id: true } } } });
    if (!project) return { ok: false, error: "not_found" };
    if (parsed.data.templateId !== project.styleId && !isActivePostTemplate(parsed.data.templateId)) {
      const archivedVersion = await db.projectVersion.findFirst({ where: { projectId, scenes: { path: ["templateId"], equals: parsed.data.templateId } }, select: { id: true } });
      if (!archivedVersion) return { ok: false, error: "invalid" };
    }
    const screenCount = meta?.success ? meta.data.screens.length : project.assets.length;
    if (parsed.data.pages.some((page) => page.imageIndex !== null && page.imageIndex >= screenCount || page.members?.some((member) => member.imageIndex !== null && member.imageIndex >= screenCount))) return { ok: false, error: "invalid" };
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

export async function editPostWithAi(projectId: string, expectedVersion: number, instruction: string, requestId: string): Promise<Result<{ version: PostVersion; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!z.uuid().safeParse(requestId).success || typeof instruction !== "string" || instruction.trim().length < 3 || instruction.length > 1500) return { ok: false, error: "invalid" };
  const key = `post:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  const reference = `post-edit:${requestId}`;
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "POST", status: "READY" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (!project) return { ok: false, error: "not_found" };
    const existing = await db.creditTransaction.findFirst({ where: { userId: user.id, type: "EDIT", reference } });
    if (existing) {
      const completed = await db.projectVersion.findFirst({ where: { projectId, messageId: requestId } });
      if (completed) return { ok: true, version: { id: completed.id, number: completed.number, label: completed.label, document: PostDocumentSchema.parse(completed.scenes) }, balance: (await getCreditBalance(user.id)).total };
      return { ok: false, error: "busy" };
    }
    if (project.versions[0]?.number !== expectedVersion) return { ok: false, error: "conflict" };
    if (await limited("edit", user.id)) return { ok: false, error: "rate_limited" };
    const current = PostDocumentSchema.parse(project.versions[0].scenes);
    try { await spendCredits(user.id, { amount: CREDIT_COSTS.post.edit, type: "EDIT", reference, description: `Instagram · ${project.name}` }, async (tx) => { await tx.chatMessage.create({ data: { id: requestId, projectId, role: "USER", content: instruction.trim() } }); }); }
    catch (error) { return failed(error); }
    try {
      const document = PostDocumentSchema.parse(await writePostCopy(current, { appName: project.appName, brief: project.brief ?? "", locale: project.locale, instruction: instruction.trim() }, { userId: user.id, plan: user.plan }));
      const version = await db.$transaction(async (tx) => {
        const version = await tx.projectVersion.create({ data: { projectId, number: expectedVersion + 1, label: instruction.slice(0, 80), scenes: document, messageId: requestId } });
        await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
        return version;
      });
      refresh();
      return { ok: true, version: { id: version.id, number: version.number, label: version.label, document }, balance: (await getCreditBalance(user.id)).total };
    } catch {
      await refundCredits(user.id, { amount: CREDIT_COSTS.post.edit, reference, description: "Instagram · remboursement modification" });
      return { ok: false, error: "ai_unavailable" };
    }
  } finally { await releaseLock(key, lock); }
}

export async function sharePost(projectId: string, enabled: boolean): Promise<Result<{ token: string | null }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (typeof enabled !== "boolean") return { ok: false, error: "invalid" };
  if (await limited("project", user.id)) return { ok: false, error: "rate_limited" };
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "POST", status: "READY" } });
  if (!project) return { ok: false, error: "not_found" };
  const token = enabled ? project.shareToken ?? randomBytes(24).toString("base64url") : null;
  await db.project.update({ where: { id: projectId }, data: { shareToken: token } });
  return { ok: true, token };
}

export async function exportPost(projectId: string, expectedVersion: number, format: "png" | "jpg", requestId: string): Promise<Result<{ id: string; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!["png", "jpg"].includes(format) || !z.uuid().safeParse(requestId).success) return { ok: false, error: "invalid" };
  const key = `post:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return { ok: false, error: "busy" };
  try {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "POST", status: "READY" }, include: { assets: { orderBy: { position: "asc" } }, versions: { orderBy: { number: "desc" }, take: 1 } } });
    if (!project) return { ok: false, error: "not_found" };
    const existing = await db.postExport.findUnique({ where: { requestId } });
    if (existing) return existing.projectId === projectId && existing.status === "DONE" ? { ok: true, id: existing.id, balance: (await getCreditBalance(user.id)).total } : { ok: false, error: "busy" };
    const version = project.versions[0];
    if (!version || version.number !== expectedVersion) return { ok: false, error: "conflict" };
    if (await limited("export", user.id)) return { ok: false, error: "rate_limited" };
    if (!(await limitKey("post-export-global", "all", LIMITS.exportGlobal)).ok || user.plan === "FREE" && !(await limitKey("post-export-global", "free", LIMITS.exportGlobalFree)).ok) return { ok: false, error: "rate_limited" };
    const document = PostDocumentSchema.parse(version.scenes);
    const reexport = Boolean(await db.postExport.findFirst({ where: { projectId, status: "DONE" }, select: { id: true } }));
    const cost = getPostExportCost(document.pages.length, reexport);
    const exportId = randomUUID();
    try { await spendCredits(user.id, { amount: cost, type: "EXPORT", reference: exportId, description: `Instagram · ${project.name} · ${document.pages.length} ${format.toUpperCase()}` }, async (tx) => {
      await tx.postExport.create({ data: { id: exportId, projectId, versionId: version.id, requestId, format, creditCost: cost, status: "RENDERING" } });
    }); } catch (error) { return failed(error); }
    try {
      const embedded = new Map<string, string>();
      const ratios = new Map<string, number>();
      for (const asset of project.assets.filter((asset) => asset.type === "LOGO" || asset.type === "SCREEN")) {
        const key = uploadKey(asset.url);
        if (!key || !isOwnUpload(user.id, asset.url)) throw new Error("invalid_media");
        const bytes = await storage.get(key);
        if (!bytes) throw new Error("missing_media");
        const png = await sharp(bytes, { limitInputPixels: 40_000_000 }).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
        embedded.set(asset.url, `data:image/png;base64,${png.data.toString("base64")}`);
        ratios.set(asset.url, png.info.width / png.info.height);
      }
      const logo = project.assets.find((asset) => asset.type === "LOGO");
      const media = { appName: project.appName, logoUrl: logo ? embedded.get(logo.url) : null, screenUrls: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => embedded.get(asset.url)!), screenRatios: project.assets.filter((asset) => asset.type === "SCREEN").map((asset) => ratios.get(asset.url) ?? null), watermark: getPlan(user.plan).watermark };
      const files: string[] = [];
      for (let i = 0; i < document.pages.length; i++) {
        const svg = postSvg(document, i, media);
        const renderer = sharp(Buffer.from(svg));
        const data = format === "png" ? await renderer.png().toBuffer() : await renderer.jpeg({ quality: 95 }).toBuffer();
        const stored = await storage.put(new File([new Uint8Array(data)], `${String(i + 1).padStart(2, "0")}.${format}`, { type: format === "png" ? "image/png" : "image/jpeg" }), `${user.id}/image`);
        files.push(stored.url);
      }
      await db.postExport.update({ where: { id: exportId }, data: { status: "DONE", files } });
      return { ok: true, id: exportId, balance: (await getCreditBalance(user.id)).total };
    } catch {
      await refundCredits(user.id, { amount: cost, reference: exportId, description: "Instagram · remboursement export" });
      await db.postExport.update({ where: { id: exportId }, data: { status: "FAILED" } });
      return { ok: false, error: "render_failed" };
    }
  } finally { await releaseLock(key, lock); }
}
