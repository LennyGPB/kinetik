"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CREDIT_COSTS } from "@/config/credits";
import { spendCredits, getCreditBalance, InsufficientCreditsError } from "@/lib/credits/ledger";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { LogoMotionSchema, logoMotionGraph, type LogoMotionInput } from "./logo-motion";
import type { ActionResult } from "./types";

export async function createLogoMotion(input: LogoMotionInput): Promise<ActionResult<{ id: string; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = LogoMotionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const existing = await db.project.findUnique({ where: { id: data.requestId }, select: { userId: true, videoType: true, status: true } });
  if (existing) return existing.userId === user.id && existing.videoType === "logo-motion" && existing.status === "READY" ? { ok: true, id: data.requestId, balance: (await getCreditBalance(user.id)).total } : { ok: false, error: "invalid" };
  if (!(await limitKey("generation", user.id, LIMITS.generation.map((rule) => ({ ...rule, strict: true })))).ok) return { ok: false, error: "rate_limited" };
  try {
    const balance = await spendCredits(user.id, { amount: CREDIT_COSTS.generation, type: "GENERATION", reference: data.requestId, description: `Logo motion · ${data.text.slice(0, 40)}` }, async (tx) => {
      await tx.project.create({ data: { id: data.requestId, userId: user.id, kind: "MOTION", videoType: "logo-motion", status: "READY", name: data.text.slice(0, 40), appName: data.text.slice(0, 40), locale: data.locale, format: data.format, duration: data.duration, styleId: data.templateId, colors: data.colors, musicTrackId: data.musicTrackId,
        versions: { create: { number: 1, scenes: logoMotionGraph(data), label: data.locale === "fr" ? "Logo motion créé" : "Logo motion created" } } } });
    });
    return { ok: true, id: data.requestId, balance: balance.total };
  } catch (error) {
    // A concurrent retry can reach the unique project ID; its debit is rolled back with the transaction.
    const completed = await db.project.findFirst({ where: { id: data.requestId, userId: user.id, videoType: "logo-motion", status: "READY" }, select: { id: true } });
    if (completed) return { ok: true, id: completed.id, balance: (await getCreditBalance(user.id)).total };
    if (error instanceof InsufficientCreditsError) return { ok: false, error: "insufficient_credits", required: error.required, available: error.available };
    console.error("[logo-motion:create]", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, error: "invalid" };
  }
}
