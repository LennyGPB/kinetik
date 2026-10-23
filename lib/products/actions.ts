"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CREDIT_COSTS } from "@/config/credits";
import { spendCredits, getCreditBalance, InsufficientCreditsError } from "@/lib/credits/ledger";
import { LIMITS, limitKey } from "@/lib/security/limits";
import { isOwnUpload, storage } from "@/lib/storage";
import { PhysicalProductSchema, physicalProductGraph, type PhysicalProductInput } from "./model";
import type { ActionResult } from "../projects/types";
import type { Prisma } from "../generated/prisma/client";

export async function createPhysicalProduct(input: PhysicalProductInput): Promise<ActionResult<{ id: string; balance: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = PhysicalProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const completed = async () => db.project.findFirst({ where: { id: data.requestId, userId: user.id, videoType: "physical-product", status: "READY" }, select: { id: true } });
  if (await completed()) return { ok: true, id: data.requestId, balance: (await getCreditBalance(user.id)).total };
  const files = [...data.images, ...data.originals, ...(data.logo ? [data.logo] : []), ...(data.music ? [data.music] : [])];
  if (files.some((file) => !isOwnUpload(user.id, file.url))) return { ok: false, error: "invalid" };
  if (!(await limitKey("generation", user.id, LIMITS.generation.map((rule) => ({ ...rule, strict: true })))).ok) return { ok: false, error: "rate_limited" };
  try {
    for (const file of files) if (!await storage.get(file.url.slice("/api/uploads/".length))) return { ok: false, error: "invalid" };
    const balance = await spendCredits(user.id, { amount: CREDIT_COSTS.generation, type: "GENERATION", reference: data.requestId, description: `Product video · ${data.name}` }, async (tx) => {
      await tx.project.create({ data: { id: data.requestId, userId: user.id, kind: "MOTION", videoType: "physical-product", status: "READY", name: data.name, appName: data.name, locale: data.locale, format: data.format, duration: data.duration, styleId: data.templateId, colors: data.colors, websiteUrl: data.websiteUrl || null, musicTrackId: data.music ? null : data.musicTrackId,
        brief: JSON.stringify({ product: data.name, benefits: data.benefits, price: data.price, originals: data.originals.map((file) => file.url) }),
        assets: { create: [...data.images.map((file, position) => ({ ...file, position, type: "SCREEN" as const })), ...(data.logo ? [{ ...data.logo, type: "LOGO" as const }] : []), ...(data.music ? [{ ...data.music, type: "MUSIC" as const }] : [])] },
        versions: { create: { number: 1, scenes: physicalProductGraph(data) as unknown as Prisma.InputJsonValue, label: data.locale === "fr" ? "Vidéo produit créée" : "Product video created" } } } });
      if (data.saveBrand) await tx.brandKit.create({ data: { userId: user.id, name: data.name, colors: data.colors, sourceUrl: data.websiteUrl || null, brief: { type: "physical-product", product: data.name, benefits: data.benefits }, assets: { create: [...data.images.map((file, position) => ({ ...file, position, type: "SCREEN" as const })), ...(data.logo ? [{ ...data.logo, type: "LOGO" as const }] : [])] } } });
    });
    return { ok: true, id: data.requestId, balance: balance.total };
  } catch (error) {
    if (await completed()) return { ok: true, id: data.requestId, balance: (await getCreditBalance(user.id)).total };
    if (error instanceof InsufficientCreditsError) return { ok: false, error: "insufficient_credits", required: error.required, available: error.available };
    console.error("[physical-product:create]", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, error: "invalid" };
  }
}
