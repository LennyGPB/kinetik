import "server-only";
import { db } from "@/lib/db";
import { refundCredits } from "@/lib/credits/ledger";
import { acquireLock, releaseLock } from "@/lib/rate-limit";
import { CREDIT_COSTS, getPostGenerationCost } from "@/config/credits";
import { PostDocumentSchema } from "./document";

/** Recover charged operations interrupted by a process restart. Never replay a paid AI call. */
export async function recoverPostOperations(userId: string, projectId: string) {
  const cutoff = new Date(Date.now() - 180_000);
  const project = await db.project.findFirst({ where: { id: projectId, userId, kind: "POST" }, select: { status: true, createdAt: true, versions: { orderBy: { number: "asc" }, take: 1, select: { scenes: true } } } });
  if (!project) return;
  if (project.status === "GENERATING" && project.createdAt < cutoff) {
    const key = `post-create:${userId}`;
    const lock = await acquireLock(key, 180_000, true);
    if (lock) try {
      const fresh = await db.project.findFirst({ where: { id: projectId, userId, kind: "POST", status: "GENERATING" } });
      const doc = PostDocumentSchema.safeParse(project.versions[0]?.scenes);
      if (fresh && doc.success) {
        await refundCredits(userId, { reference: projectId, amount: getPostGenerationCost(doc.data.pages.length), description: "Instagram · génération interrompue" });
        await db.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
      }
    } finally { await releaseLock(key, lock); }
  }
  const key = `post:${projectId}`;
  const lock = await acquireLock(key, 180_000, true);
  if (!lock) return;
  try {
    const exports = await db.postExport.findMany({ where: { projectId, status: { in: ["PENDING", "RENDERING"] }, createdAt: { lt: cutoff } } });
    for (const item of exports) {
      await refundCredits(userId, { reference: item.id, amount: item.creditCost, description: "Instagram · export interrompu" });
      await db.postExport.update({ where: { id: item.id }, data: { status: "FAILED" } });
    }
    const messages = await db.chatMessage.findMany({ where: { projectId, role: "USER", createdAt: { lt: cutoff }, version: null }, select: { id: true } });
    for (const message of messages) {
      const reference = `post-edit:${message.id}`;
      if (await db.creditTransaction.findFirst({ where: { userId, type: "EDIT", reference, amount: { lt: 0 } }, select: { id: true } })) {
        await refundCredits(userId, { reference, amount: CREDIT_COSTS.post.edit, description: "Instagram · modification interrompue" });
      }
    }
  } finally { await releaseLock(key, lock); }
}
