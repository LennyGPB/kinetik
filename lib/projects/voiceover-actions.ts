"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCreditBalance, InsufficientCreditsError, spendCredits, refundCredits } from "@/lib/credits/ledger";
import { acquireLock, releaseLock, rateLimitAll } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { narrationVoices, synthesizeNarration, type NarrationVoice } from "@/lib/services/elevenlabs";
import { proposeNarration } from "@/lib/services/ai";
import { CREDIT_COSTS, getVoiceoverCost } from "@/config/credits";
import { parseSceneGraph, totalDuration, type SceneGraph } from "./scenes";
import { fitVoiceScenes, sceneVoiceContent, type Voiceover } from "./voiceover";
import type { ActionResult, EditorVersion } from "./types";
import { recoverNarrationCredits } from "./voiceover-recovery";

const Id = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const Input = z.object({ enabled: z.boolean(), voiceId: z.string().max(100).regex(/^[A-Za-z0-9_-]*$/), language: z.enum(["fr", "en"]),
  volume: z.number().min(0).max(1), duckMusic: z.boolean(), autoFit: z.boolean().optional(), captions: z.boolean().optional(), segments: z.array(z.object({ sceneId: Id, text: z.string().trim().max(1000) })).max(12) });
type Settings = z.infer<typeof Input>;
type Result = ActionResult<{ version: EditorVersion; balance: number }>;
const versionDto = (v: { id: string; number: number; label: string; createdAt: Date; scenes: unknown }): EditorVersion => ({
  id: v.id, number: v.number, label: v.label, createdAt: v.createdAt.toISOString(), graph: parseSceneGraph(v.scenes),
});

async function context(projectId: string, baseVersionId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  if (!Id.safeParse(projectId).success) throw new Error("invalid");
  if (!(await rateLimitAll([[`voiceover:${user.id}`, { limit: 60, windowMs: 60_000, strict: true }]])).ok) throw new Error("rate_limited");
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, kind: "MOTION", status: "READY" }, include: { versions: { orderBy: { number: "desc" }, take: 1 } } });
  if (!project?.versions[0]) throw new Error("not_found");
  const latest = project.versions[0];
  if (baseVersionId && baseVersionId !== latest.id) throw new Error("busy");
  return { user, project, latest, graph: parseSceneGraph(latest.scenes) };
}

function settingsGraph(graph: SceneGraph, input: Settings): SceneGraph {
  if (new Set(input.segments.map((s) => s.sceneId)).size !== input.segments.length
    || input.segments.some((s) => !graph.scenes.some((scene) => scene.id === s.sceneId))) throw new Error("invalid");
  const voiceover: Voiceover = { ...input, segments: graph.scenes.map((scene) => {
    const text = input.segments.find((s) => s.sceneId === scene.id)?.text ?? "";
    const old = graph.voiceover?.segments.find((s) => s.sceneId === scene.id);
    return { sceneId: scene.id, text, ...(old?.clip && { clip: old.clip }) };
  }) };
  return { ...graph, voiceover };
}

/** Optimistic version check under a project row lock; slow provider calls never hold a transaction. */
async function saveVersion(projectId: string, baseVersionId: string, graph: SceneGraph, label: string, receipt?: { userId: string; reference: string }) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
    const latest = await tx.projectVersion.findFirst({ where: { projectId }, orderBy: { number: "desc" } });
    if (latest?.id !== baseVersionId) throw new Error("busy");
    await tx.project.update({ where: { id: projectId }, data: { duration: Math.round(totalDuration(graph)), updatedAt: new Date() } });
    if (receipt) await tx.creditTransaction.updateMany({ where: { userId: receipt.userId, reference: `claim:${receipt.reference}` }, data: { description: "Voiceover settled" } });
    return tx.projectVersion.create({ data: { projectId, number: latest.number + 1, scenes: graph as unknown as Prisma.InputJsonValue, label } });
  });
}

function failure(error: unknown): Result {
  if (error instanceof InsufficientCreditsError) return { ok: false, error: "insufficient_credits", required: error.required, available: error.available };
  const message = error instanceof Error ? error.message : "";
  const known = ["unauthorized", "invalid", "not_found", "busy", "rate_limited"] as const;
  return { ok: false, error: known.find((k) => k === message) ?? "ai_unavailable" };
}

export async function listNarrationVoices(): Promise<ActionResult<{ voices: NarrationVoice[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "unauthorized" };
    if (!(await rateLimitAll([[`voices:${user.id}`, { limit: 10, windowMs: 60_000, strict: true }]])).ok) return { ok: false, error: "rate_limited" };
    return { ok: true, voices: await narrationVoices() };
  } catch { return { ok: false, error: "ai_unavailable" }; }
}

export async function saveNarration(projectId: string, baseVersionId: string, input: Settings, extendSceneId?: string): Promise<Result> {
  try {
    const { user, graph } = await context(projectId, baseVersionId);
    let next = settingsGraph(graph, Input.parse(input));
    if (extendSceneId) {
      if (graph.recording) throw new Error("invalid");
      if (extendSceneId !== "all" && !next.scenes.some((s) => s.id === extendSceneId)) throw new Error("invalid");
      next = fitVoiceScenes(next, extendSceneId === "all" ? undefined : [extendSceneId]);
    }
    const v = await saveVersion(projectId, baseVersionId, next, input.language === "fr" ? "Réglages voix off" : "Voiceover settings");
    return { ok: true, version: versionDto(v), balance: (await getCreditBalance(user.id)).total };
  } catch (error) { return failure(error); }
}

/** One paid request per scene (or script). Each successful segment is saved before the next starts. */
export async function generateNarration(projectId: string, baseVersionId: string, input: Settings, requestId: string, sceneId?: string): Promise<Result> {
  let charged = false;
  let committed = false;
  let userId = "";
  let cost = 0;
  let reference = "";
  let lock: string | null = null;
  try {
    Id.parse(requestId); if (sceneId) Id.parse(sceneId);
    const ctx = await context(projectId);
    userId = ctx.user.id;
    await recoverNarrationCredits(userId);
    reference = `voice:${projectId}:${requestId}`;
    lock = await acquireLock(`voice:${userId}`, 180_000, true);
    if (!lock) throw new Error("busy");
    // A network retry returns the saved result without paying the provider twice.
    const completed = await db.projectVersion.findFirst({ where: { projectId, scenes: { path: ["voiceover", "requestId"], equals: requestId } }, orderBy: { number: "asc" } });
    if (completed) return { ok: true, version: versionDto(completed), balance: (await getCreditBalance(userId)).total };
    const receipt = await db.creditTransaction.findFirst({ where: { userId, reference: `claim:${reference}` } });
    if (receipt) {
      if (Date.now() - receipt.createdAt.getTime() > 180_000) {
        const debits = await db.creditTransaction.findMany({ where: { userId, reference, amount: { lt: 0 } } });
        const amount = -debits.reduce((sum, d) => sum + d.amount, 0);
        if (amount) await refundCredits(userId, { amount, reference, description: "Voiceover · interrupted request" });
        throw new Error("ai_unavailable");
      }
      throw new Error("busy");
    }
    if (ctx.latest.id !== baseVersionId) throw new Error("busy");
    let next = settingsGraph(ctx.graph, Input.parse(input));
    next.voiceover!.requestId = requestId;
    const segment = next.voiceover!.segments.find((s) => s.sceneId === sceneId);
    if (sceneId && (!segment?.text || !next.voiceover!.voiceId || next.voiceover!.language !== (next.language ?? next.voiceover!.language))) throw new Error("invalid");
    if (sceneId) {
      const voices = await narrationVoices();
      if (!voices.some((v) => v.id === next.voiceover!.voiceId)) throw new Error("invalid");
    }
    cost = sceneId ? getVoiceoverCost(segment!.text) : CREDIT_COSTS.voiceover.script;
    await spendCredits(userId, { amount: cost, type: "EDIT", reference, description: sceneId ? "Voiceover · audio" : "Voiceover · script" }, async (tx) => {
      if (await tx.creditTransaction.findFirst({ where: { userId, reference: `claim:${reference}` } })) throw new Error("busy");
      await tx.creditTransaction.create({ data: { userId, amount: 0, type: "EDIT", source: "PACK", reference: `claim:${reference}`, description: "Internal voiceover receipt" } });
    });
    charged = true;
    if (sceneId) {
      const index = next.scenes.findIndex((s) => s.id === sceneId);
      const textAt = (i: number) => next.voiceover!.segments.find((s) => s.sceneId === next.scenes[i]?.id)?.text;
      const audio = await synthesizeNarration({ text: segment!.text, voiceId: next.voiceover!.voiceId, previousText: textAt(index - 1), nextText: textAt(index + 1) });
      const stored = await storage.put(new File([new Uint8Array(audio.data)], "voiceover.wav", { type: "audio/wav" }), `${userId}/audio`);
      segment!.clip = { src: stored.url, text: segment!.text, duration: audio.duration, voiceId: next.voiceover!.voiceId, modelId: audio.modelId,
        language: next.voiceover!.language, sceneContent: sceneVoiceContent(next.scenes[index]), ...(audio.alignment && { alignment: audio.alignment }) };
      if (next.voiceover!.autoFit) next = fitVoiceScenes(next);
    } else {
      const suggestions = await proposeNarration(next, ctx.project.appName, ctx.project.brief, { userId, plan: ctx.user.plan });
      next.voiceover!.segments = suggestions.map((s) => ({ ...s, ...(next.voiceover!.segments.find((old) => old.sceneId === s.sceneId)?.clip && { clip: next.voiceover!.segments.find((old) => old.sceneId === s.sceneId)!.clip }) }));
    }
    const balance = (await getCreditBalance(userId)).total;
    const v = await saveVersion(projectId, baseVersionId, next, input.language === "fr" ? (sceneId ? "Voix off générée" : "Script voix off") : (sceneId ? "Voiceover generated" : "Voiceover script"), { userId, reference });
    committed = true;
    return { ok: true, version: versionDto(v), balance };
  } catch (error) {
    if (charged && !committed) {
      await refundCredits(userId, { amount: cost, reference, description: "Voiceover · failed request" });
      await db.creditTransaction.updateMany({ where: { userId, reference: `claim:${reference}` }, data: { description: "Voiceover settled" } });
    }
    return failure(error);
  } finally { if (lock) await releaseLock(`voice:${userId}`, lock); }
}
