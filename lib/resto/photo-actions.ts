"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { isOwnUpload, storage } from "@/lib/storage";
import { limitKey } from "@/lib/security/limits";
import { uploadedFileSchema } from "@/lib/projects/validation";
import type { ActionResult } from "@/lib/projects/types";
import type { UploadedFile } from "@/lib/storage/client";
import { canUseResto, needsRestoOffer } from "./access";
import { enhanceDishPhoto, plateDisc } from "./enhance";
import { analyzeDishPhoto } from "./vision";

const MIN = 60_000, DAY = 24 * 60 * MIN;
/** Une analyse = un appel IA (~1 centime) : plafonné, sans bloquer un menu de 7 photos. */
const PHOTO_LIMITS = [{ limit: 15, windowMs: MIN }, { limit: 150, windowMs: DAY }];

const InputSchema = z.object({
  photo: uploadedFileSchema.refine((f) => f.mimeType.startsWith("image/") && f.url.includes("/image/")),
  locale: z.enum(["fr", "en"]),
  /** Préparer aussi le disque de l'assiette (Table 3D, plat du jour seulement) */
  plate: z.boolean().default(false),
});

export type PreparedPhoto = {
  improved: UploadedFile;
  disc: UploadedFile | null;
  /** null si l'IA n'a pas pu regarder la photo : elle reste améliorée, sans cadrage automatique */
  analysis: { isFood: boolean; dishName: string; confidence: "high" | "medium" | "low"; focus: { x: number; y: number } } | null;
};

async function save(userId: string, data: Buffer, name: string, type: string, width?: number, height?: number): Promise<UploadedFile> {
  const stored = await storage.put(new File([new Uint8Array(data)], name, { type }), `${userId}/image`);
  return { url: stored.url, fileName: name, mimeType: type, sizeBytes: data.length, ...(width && { width }), ...(height && { height }) };
}

/**
 * Prépare une photo de plat : l'IA repère le plat (cadrage), devine son nom et repère l'assiette si elle est entière ;
 * la photo est ensuite améliorée (lumière, fond flouté autour du plat) et, si demandé, l'assiette redressée en disque.
 * La photo originale reste disponible : le restaurateur choisit.
 */
export async function prepareRestoPhoto(input: z.input<typeof InputSchema>): Promise<ActionResult<PreparedPhoto>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!canUseResto(user) || needsRestoOffer(user)) return { ok: false, error: "not_found" };
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success || !isOwnUpload(user.id, parsed.data.photo.url)) return { ok: false, error: "invalid" };
  if (!(await limitKey("resto-photo", user.id, PHOTO_LIMITS)).ok) return { ok: false, error: "rate_limited" };
  const buffer = await storage.get(parsed.data.photo.url.slice("/api/uploads/".length));
  if (!buffer) return { ok: false, error: "invalid" };
  try {
    const analysis = await analyzeDishPhoto(buffer, parsed.data.locale, { userId: user.id, plan: user.plan }).catch((error: unknown) => {
      console.warn("[resto:photo] analyse indisponible", error instanceof Error ? error.message : "unknown");
      return null;
    });
    const enhanced = await enhanceDishPhoto(buffer, analysis?.isFood ? analysis.box : null);
    const improved = await save(user.id, enhanced.data, "plat-ameliore.jpg", "image/jpeg", enhanced.width, enhanced.height);
    const discData = parsed.data.plate && analysis?.plate ? await plateDisc(buffer, analysis.plate) : null;
    const disc = discData ? await save(user.id, discData, "assiette.png", "image/png", 1400, 1400) : null;
    return { ok: true, improved, disc, analysis: analysis && { isFood: analysis.isFood, dishName: analysis.dishName, confidence: analysis.confidence, focus: analysis.focus } };
  } catch (error) {
    console.error("[resto:photo]", error instanceof Error ? error.message : "unknown");
    return { ok: false, error: "invalid" };
  }
}
