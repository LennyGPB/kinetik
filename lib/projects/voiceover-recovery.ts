import "server-only";
import { db } from "@/lib/db";
import { refundCredits } from "@/lib/credits/ledger";

/** Recover paid calls interrupted by a server restart; completed versions are the durable success receipt. */
export async function recoverNarrationCredits(userId?: string) {
  const claims = await db.creditTransaction.findMany({ where: {
    ...(userId && { userId }), description: "Internal voiceover receipt", reference: { startsWith: "claim:voice:" },
    createdAt: { lt: new Date(Date.now() - 10 * 60_000) },
  }, orderBy: { createdAt: "asc" }, take: 100 });
  let recovered = 0;
  for (const claim of claims) {
    const reference = claim.reference!.slice("claim:".length);
    const [, projectId, requestId] = reference.split(":");
    const completed = await db.projectVersion.findFirst({ where: { projectId, project: { userId: claim.userId }, scenes: { path: ["voiceover", "requestId"], equals: requestId } }, select: { id: true } });
    if (!completed) {
      const debits = await db.creditTransaction.findMany({ where: { userId: claim.userId, reference, amount: { lt: 0 } } });
      const amount = -debits.reduce((sum, d) => sum + d.amount, 0);
      if (amount) { await refundCredits(claim.userId, { amount, reference, description: "Voiceover · interrupted request" }); recovered++; }
    }
    await db.creditTransaction.update({ where: { id: claim.id }, data: { description: "Voiceover settled" } });
  }
  return recovered;
}
