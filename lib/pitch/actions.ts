"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCreditBalance, InsufficientCreditsError, spendCredits } from "@/lib/credits/ledger";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { CREDIT_COSTS } from "@/config/credits";
import { getTrack } from "@/config/music";
import { parseSceneGraph } from "../projects/scenes";
import { attachPitchVoice, normalizePitchPlan, pitchGraph, type PitchPlan } from "./model";
import type { Prisma } from "../generated/prisma/client";

export async function getPitchReview(projectId: string) {
  const user = await getCurrentUser();
  if (!user || typeof projectId !== "string" || projectId.length > 100) return null;
  const project = await db.project.findFirst({ where: { id: projectId, userId: user.id, videoType: "pitch-deck" }, include: { versions: { orderBy: { number: "desc" }, take: 1 }, assets: { orderBy: { position: "asc" } } } });
  const graph = project?.versions[0] && parseSceneGraph(project.versions[0].scenes);
  if (!project || !graph?.pitch?.plan) return null;
  return { projectId: project.id, metadata: graph.pitch, plan: graph.pitch.plan, status: project.status,
    version: { id: project.versions[0].id, number: project.versions[0].number, label: project.versions[0].label, createdAt: project.versions[0].createdAt.toISOString(), graph },
    assets: project.assets.map((a) => ({ type: a.type, url: a.url, fileName: a.fileName })), balance: (await getCreditBalance(user.id)).total };
}

export async function createPitchMotion(projectId: string, input: { plan: PitchPlan; voiceId: string | null; musicTrackId: string | null }) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "unauthorized" };
  const lock = await acquireLock(`pitch-create:${user.id}`, 30_000, true);
  if (!lock) return { ok: false as const, error: "busy" };
  try {
    const review = await getPitchReview(projectId);
    if (!review) return { ok: false as const, error: "not_found" };
    if (review.status === "READY") return { ok: true as const, projectId, version: review.version, balance: review.balance };
    if (review.metadata.state !== "review") return { ok: false as const, error: "busy" };
    const settings = z.object({ voiceId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).nullable(), musicTrackId: z.string().max(100).nullable() }).parse(input);
    const track = settings.musicTrackId ? getTrack(settings.musicTrackId) : null;
    if (settings.musicTrackId && !track) return { ok: false as const, error: "invalid" };
    const plan = normalizePitchPlan(input.plan, review.metadata.options, review.metadata.pages ?? 20);
    const screens = Object.fromEntries(review.assets.filter((a) => a.type === "SCREEN").map((a) => [a.fileName.replace(/\.png$/, ""), a.url]));
    let graph = pitchGraph(plan, review.metadata, screens, track ? { id: track.id, bpm: track.bpm, beatOffset: track.beatOffset ?? 0 } : null);
    if (settings.voiceId) graph = attachPitchVoice(graph, plan, settings.voiceId);
    let saved: { id: string; number: number; label: string; createdAt: Date } | undefined;
    const balance = await spendCredits(user.id, { amount: CREDIT_COSTS.pitch.creation, type: "GENERATION", reference: `pitch-create:${projectId}`, description: "Pitch · motion creation" }, async (tx) => {
      const result = await tx.project.updateMany({ where: { id: projectId, userId: user.id, status: "DRAFT" }, data: { status: "READY", appName: plan.company, name: plan.company,
        duration: review.metadata.options.duration, colors: plan.brand.colors, musicTrackId: track?.id ?? null } });
      if (!result.count) throw new Error("busy");
      saved = await tx.projectVersion.create({ data: { projectId, number: review.version.number + 1, label: review.metadata.options.locale === "fr" ? "Pitch deck en motion" : "Pitch deck motion", scenes: graph as unknown as Prisma.InputJsonValue } });
    });
    return { ok: true as const, projectId, version: { ...saved!, createdAt: saved!.createdAt.toISOString(), graph }, balance: balance.total };
  } catch (error) {
    return { ok: false as const, error: error instanceof InsufficientCreditsError ? "insufficient_credits" : "creation_failed" };
  } finally { await releaseLock(`pitch-create:${user.id}`, lock); }
}
