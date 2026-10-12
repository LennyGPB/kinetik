import "server-only";
import { db } from "@/lib/db";
import type { CreditSource, CreditTransactionType } from "@/lib/generated/prisma/client";

/**
 * Ledger de crédits : le solde n'est jamais stocké, il est la somme des transactions.
 *
 * - Crédits d'ABONNEMENT : ont un `expiresAt` (date de renouvellement). À l'expiration,
 *   le job de renouvellement appelle `expireSubscriptionCredits` qui écrit une ligne EXPIRATION.
 * - Crédits de PACK (et bonus) : n'expirent pas.
 * - Les débits consomment d'abord les crédits d'abonnement (ceux qui expirent).
 */

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(`Crédits insuffisants : ${available} disponibles, ${required} requis`);
    this.name = "InsufficientCreditsError";
  }
}

type Client = Pick<typeof db, "creditTransaction">;

export type CreditBalance = {
  total: number;
  subscription: number;
  pack: number;
  /** Prochaine expiration des crédits d'abonnement */
  subscriptionExpiresAt: Date | null;
};

async function computeBalance(client: Client, userId: string): Promise<CreditBalance> {
  const groups = await client.creditTransaction.groupBy({
    by: ["source"],
    where: { userId },
    _sum: { amount: true },
  });
  const sum = (source: CreditSource) => Math.max(0, groups.find((g) => g.source === source)?._sum.amount ?? 0);
  const subscription = sum("SUBSCRIPTION");
  const pack = sum("PACK");

  const nextExpiry =
    subscription > 0
      ? await client.creditTransaction.findFirst({
          where: { userId, source: "SUBSCRIPTION", amount: { gt: 0 }, expiresAt: { gt: new Date() } },
          orderBy: { expiresAt: "asc" },
          select: { expiresAt: true },
        })
      : null;

  return { total: subscription + pack, subscription, pack, subscriptionExpiresAt: nextExpiry?.expiresAt ?? null };
}

export function getCreditBalance(userId: string) {
  return computeBalance(db, userId);
}

export async function grantCredits(
  userId: string,
  input: { amount: number; type: CreditTransactionType; source: CreditSource; description: string; reference?: string; expiresAt?: Date },
) {
  if (input.amount <= 0) throw new Error("grantCredits attend un montant positif");
  return db.creditTransaction.create({ data: { userId, ...input } });
}

/**
 * Débite atomiquement `amount` crédits. Lève InsufficientCreditsError si le solde est trop bas.
 * Renvoie le nouveau solde.
 */
export async function spendCredits(
  userId: string,
  input: { amount: number; type: CreditTransactionType; description: string; reference?: string },
) {
  if (input.amount <= 0) return getCreditBalance(userId);

  return db.$transaction(async (tx) => {
    const balance = await computeBalance(tx, userId);
    if (balance.total < input.amount) throw new InsufficientCreditsError(input.amount, balance.total);

    const fromSubscription = Math.min(balance.subscription, input.amount);
    const fromPack = input.amount - fromSubscription;
    const base = { userId, type: input.type, description: input.description, reference: input.reference };

    if (fromSubscription > 0) await tx.creditTransaction.create({ data: { ...base, amount: -fromSubscription, source: "SUBSCRIPTION" } });
    if (fromPack > 0) await tx.creditTransaction.create({ data: { ...base, amount: -fromPack, source: "PACK" } });

    return computeBalance(tx, userId);
  });
}

/** Rembourse un débit (ex. rendu en échec). */
export function refundCredits(userId: string, input: { amount: number; description: string; reference?: string }) {
  return grantCredits(userId, { ...input, type: "REFUND", source: "PACK" });
}

/** À appeler au renouvellement d'abonnement, avant de créditer la nouvelle période. */
export async function expireSubscriptionCredits(userId: string) {
  return db.$transaction(async (tx) => {
    const { subscription } = await computeBalance(tx, userId);
    if (subscription <= 0) return null;
    return tx.creditTransaction.create({
      data: { userId, amount: -subscription, type: "EXPIRATION", source: "SUBSCRIPTION", description: "Expiration des crédits d'abonnement" },
    });
  });
}

export function listCreditTransactions(userId: string, take = 50) {
  return db.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, amount: true, type: true, source: true, description: true, createdAt: true, expiresAt: true },
  });
}
