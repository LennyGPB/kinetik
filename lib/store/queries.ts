import "server-only";
import { db } from "@/lib/db";
import { refundCredits } from "@/lib/credits/ledger";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { CREDIT_COSTS, getStoreGenerationCost } from "@/config/credits";
import type { UploadedFile } from "@/lib/storage/client";
import { StoreDocumentSchema, type StoreDocument } from "./document";

export type StoreVersion = { id: string; number: number; label: string; document: StoreDocument };
export type StoreEditorData = {
  id: string; name: string; appName: string; locale: string; status: string;
  versions: StoreVersion[]; exported: boolean; lastExport: string | null;
  media: { logo: UploadedFile | null; screens: UploadedFile[] };
};

/** Refund charged operations interrupted by a process restart. Never replays a paid AI call. */
async function recoverStoreOperations(userId: string, projectId: string) {
  const cutoff = new Date(Date.now() - 180_000);
  const project = await db.project.findFirst({ where: { id: projectId, userId, kind: "STORE" }, select: { status: true, createdAt: true, versions: { orderBy: { number: "asc" }, take: 1, select: { scenes: true } } } });
  if (!project) return;
  if (project.status === "GENERATING" && project.createdAt < cutoff) {
    const key = `store-create:${userId}`;
    const lock = await acquireLock(key, 180_000, true);
    if (lock) try {
      const fresh = await db.project.findFirst({ where: { id: projectId, userId, kind: "STORE", status: "GENERATING" } });
      const doc = StoreDocumentSchema.safeParse(project.versions[0]?.scenes);
      if (fresh && doc.success) {
        await refundCredits(userId, { reference: projectId, amount: getStoreGenerationCost(doc.data.pages.length), description: "Store · génération interrompue" });
        await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
      }
    } finally { await releaseLock(key, lock); }
  }
  const key = `store:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return;
  try {
    for (const item of await db.postExport.findMany({ where: { projectId, status: { in: ["PENDING", "RENDERING"] }, createdAt: { lt: cutoff } } })) {
      await refundCredits(userId, { reference: item.id, amount: item.creditCost, description: "Store · export interrompu" });
      await db.postExport.update({ where: { id: item.id }, data: { status: "FAILED" } });
    }
    for (const message of await db.chatMessage.findMany({ where: { projectId, role: "USER", createdAt: { lt: cutoff }, version: null }, select: { id: true } })) {
      const reference = `store-edit:${message.id}`;
      if (await db.creditTransaction.findFirst({ where: { userId, type: "EDIT", reference, amount: { lt: 0 } }, select: { id: true } })) {
        await refundCredits(userId, { reference, amount: CREDIT_COSTS.store.edit, description: "Store · modification interrompue" });
      }
    }
  } finally { await releaseLock(key, lock); }
}

export async function getStoreEditor(userId: string, id: string): Promise<StoreEditorData | null> {
  await recoverStoreOperations(userId, id);
  const project = await db.project.findFirst({ where: { id, userId, kind: "STORE" }, include: { assets: { orderBy: { position: "asc" } }, versions: { orderBy: { number: "desc" } }, postExports: { where: { status: "DONE" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!project) return null;
  const file = (asset: (typeof project.assets)[number]): UploadedFile => ({ url: asset.url, fileName: asset.fileName, mimeType: asset.mimeType ?? "image/png", sizeBytes: asset.sizeBytes ?? 0, ...(asset.width && asset.height ? { width: asset.width, height: asset.height } : {}) });
  const logo = project.assets.find((asset) => asset.type === "LOGO");
  return {
    id, name: project.name, appName: project.appName, locale: project.locale, status: project.status,
    versions: project.versions.flatMap((version) => { const parsed = StoreDocumentSchema.safeParse(version.scenes); return parsed.success ? [{ id: version.id, number: version.number, label: version.label, document: parsed.data }] : []; }),
    exported: project.postExports.length > 0,
    lastExport: project.postExports[0]?.id ?? null,
    media: { logo: logo ? file(logo) : null, screens: project.assets.filter((asset) => asset.type === "SCREEN").map(file) },
  };
}
