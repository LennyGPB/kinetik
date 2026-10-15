import "server-only";
import { after } from "next/server";
import { isStripeConfigured, stripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { deleteLambdaRenders } from "@/lib/services/render";
import { deleteUserFiles } from "@/lib/storage";

/**
 * Supprime un compte et tous ses fichiers.
 * L'abonnement Stripe est d'abord résilié immédiatement : en cas d'échec, rien n'est supprimé (pas de compte fantôme encore facturé).
 * La base est vidée tout de suite (cascade : sessions, projets, rendus, médias, crédits) ;
 * les fichiers (R2, disque, MP4 Remotion) sont effacés après la réponse. En cas d'échec,
 * `scripts/purge-orphan-files.ts` rattrape les dossiers des comptes qui n'existent plus.
 */
export async function deleteUserWithFiles(userId: string) {
  const { stripeSubscriptionId } = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeSubscriptionId: true } });
  if (stripeSubscriptionId && isStripeConfigured()) {
    const sub = await stripe().subscriptions.retrieve(stripeSubscriptionId);
    if (!["canceled", "incomplete_expired"].includes(sub.status)) await stripe().subscriptions.cancel(stripeSubscriptionId);
  }
  const renders = await db.render.findMany({
    where: { project: { userId }, lambdaRenderId: { not: null }, bucketName: { not: null } },
    select: { lambdaRenderId: true, bucketName: true },
  });
  await db.user.delete({ where: { id: userId } });

  after(async () => {
    const results = await Promise.allSettled([
      deleteUserFiles(userId),
      deleteLambdaRenders(renders.map((r) => ({ renderId: r.lambdaRenderId!, bucketName: r.bucketName! }))),
    ]);
    for (const result of results) if (result.status === "rejected") console.error("[account.delete] purge des fichiers incomplète", { userId, error: result.reason });
  });
}
