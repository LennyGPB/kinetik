import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { notifyGeneration } from "@/lib/services/telegram";
import { projectBalance } from "./balance";
import { getPlan, type PlanId } from "@/config/pricing";
import type { CreditSource, CreditTransactionType, Prisma } from "@/lib/generated/prisma/client";

/**
 * Ledger de crédits : le solde disponible est recalculé à partir des mouvements et de leurs échéances.
 *
 * - Crédits d'ABONNEMENT : expirent au calcul du solde, sans dépendre d'un job.
 *   `expireSubscriptionCredits` matérialise ensuite l'expiration dans l'historique.
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

async function projection(client: Client, userId: string) {
  const entries = await client.creditTransaction.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, amount: true, source: true, type: true, expiresAt: true, createdAt: true } });
  return projectBalance(entries);
}

async function computeBalance(client: Client, userId: string): Promise<CreditBalance> {
  const { total, pack, subscription, subscriptionExpiresAt } = await projection(client, userId);
  return { total, pack, subscription, subscriptionExpiresAt };
}

function positiveAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("invalid_credit_amount");
}

export function getCreditBalance(userId: string) {
  return computeBalance(db, userId);
}

export async function grantCredits(
  userId: string,
  input: { amount: number; type: CreditTransactionType; source: CreditSource; description: string; reference?: string; expiresAt?: Date },
  commit?: (tx: Prisma.TransactionClient) => Promise<unknown>,
) {
  positiveAmount(input.amount);
  if (input.source === "PACK" && input.expiresAt) throw new Error("pack_expiry_not_allowed");
  if (input.type === "SUBSCRIPTION" && input.source !== "SUBSCRIPTION" || input.type === "PURCHASE" && input.source !== "PACK") throw new Error("invalid_credit_source");
  if (["PURCHASE", "SUBSCRIPTION"].includes(input.type) && !input.reference) throw new Error("payment_reference_required");
  if (input.source === "SUBSCRIPTION" && (!input.expiresAt || !Number.isFinite(input.expiresAt.getTime()))) throw new Error("subscription_expiry_required");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (input.reference) {
      const existing = await tx.creditTransaction.findFirst({ where: { userId, type: input.type, source: input.source, reference: input.reference } });
      if (existing) {
        if (existing.amount !== input.amount || existing.expiresAt?.getTime() !== input.expiresAt?.getTime()) throw new Error("credit_reference_conflict");
        return existing;
      }
    }
    if (input.source === "SUBSCRIPTION" && input.expiresAt! <= new Date()) throw new Error("subscription_period_expired");
    const granted = await tx.creditTransaction.create({ data: { userId, ...input } });
    await commit?.(tx);
    return granted;
  });
}

/** Internal contract for a verified paid monthly allowance; Stripe verification belongs upstream. */
export async function renewSubscriptionCredits(userId: string, input: {
  planId: Exclude<PlanId, "FREE">; reference: string; startsAt: Date; endsAt: Date; accessEndsAt?: Date;
}) {
  const plan = getPlan(input.planId);
  const accessEndsAt = input.accessEndsAt ?? input.endsAt;
  if (plan.id === "FREE" || !input.reference || !Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.endsAt.getTime())
    || input.startsAt >= input.endsAt || input.startsAt > new Date() || !Number.isFinite(accessEndsAt.getTime())
    || accessEndsAt < input.endsAt) throw new Error("invalid_subscription_period");
  return grantCredits(userId, { amount: plan.credits, type: "SUBSCRIPTION", source: "SUBSCRIPTION", reference: input.reference,
    expiresAt: input.endsAt, description: `Abonnement ${plan.name}` }, async (tx) => {
    const overlap = await tx.creditTransaction.findFirst({ where: {
      userId, source: "SUBSCRIPTION", amount: { gt: 0 }, reference: { not: input.reference }, expiresAt: { gt: input.startsAt },
    } });
    if (overlap) throw new Error("subscription_period_overlap");
    await tx.user.update({ where: { id: userId }, data: { plan: input.planId, planRenewsAt: accessEndsAt } });
  });
}

/**
 * Débite atomiquement `amount` crédits. Lève InsufficientCreditsError si le solde est trop bas.
 * Renvoie le nouveau solde.
 */
export async function spendCredits(
  userId: string,
  /** `silent` : pas de notification Telegram (étape intermédiaire d'une génération déjà signalée). */
  input: { amount: number; type: CreditTransactionType; description: string; reference?: string; silent?: boolean },
  commit?: (tx: Prisma.TransactionClient) => Promise<unknown>,
) {
  if (!Number.isSafeInteger(input.amount) || input.amount < 0) throw new Error("invalid_credit_amount");
  if (input.amount === 0) return getCreditBalance(userId);

  const balance = await debit(userId, input, commit);
  if (input.type === "GENERATION" && !input.silent) {
    // Toute génération (motion, signature, Instagram, store…) est signalée sur Telegram, après la réponse.
    try { after(() => notifyGeneration({ userId, description: input.description, amount: input.amount })); }
    catch { /* Hors requête (scripts, tests) : pas de notification. */ }
  }
  return balance;
}

function debit(userId: string, input: { amount: number; type: CreditTransactionType; description: string; reference?: string }, commit?: (tx: Prisma.TransactionClient) => Promise<unknown>) {
  return db.$transaction(async (tx) => {
    // Serialize all debits for this account across every app instance.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const balance = await projection(tx, userId);
    if (balance.total < input.amount) throw new InsufficientCreditsError(input.amount, balance.total);

    let remaining = input.amount;
    // One timestamp groups all parts of this debit. Keep it distinct while the account row is locked.
    const previous = await tx.creditTransaction.findFirst({ where: { userId, amount: { lt: 0 } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const createdAt = new Date(Math.max(Date.now(), previous ? previous.createdAt.getTime() + 1 : 0));
    const base = { userId, type: input.type, description: input.description, reference: input.reference, createdAt };

    for (const lot of balance.active) {
      const used = Math.min(lot.remaining, remaining);
      if (used > 0) await tx.creditTransaction.create({ data: { ...base, amount: -used, source: "SUBSCRIPTION", expiresAt: lot.expiresAt } });
      remaining -= used;
      if (!remaining) break;
    }
    if (remaining > 0) await tx.creditTransaction.create({ data: { ...base, amount: -remaining, source: "PACK" } });

    await commit?.(tx);

    return computeBalance(tx, userId);
  });
}

/** Rembourse un débit (ex. rendu en échec). */
export function refundCredits(userId: string, input: { amount: number; description: string; reference?: string }) {
  positiveAmount(input.amount);
  const operationReference = input.reference;
  if (!operationReference) throw new Error("refund_reference_required");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const byId = await tx.creditTransaction.findFirst({ where: { id: operationReference, userId, type: { in: ["GENERATION", "EDIT", "EXPORT"] }, amount: { lt: 0 } } });
    const debits = await tx.creditTransaction.findMany({ where: byId
      ? { userId, reference: byId.reference, type: byId.type, createdAt: byId.createdAt, amount: { lt: 0 } }
      : { userId, reference: operationReference, type: { in: ["GENERATION", "EDIT", "EXPORT"] }, amount: { lt: 0 } } });
    if (!debits.length || -debits.reduce((sum, row) => sum + row.amount, 0) !== input.amount) throw new Error("refund_debit_mismatch");
    const reference = `refund:${createHash("sha256").update(debits.map((row) => row.id).sort().join(":")).digest("hex")}`;
    const existing = await tx.creditTransaction.findMany({ where: { userId, type: "REFUND", reference: { in: [reference, operationReference] } } });
    if (existing.length) {
      if (existing.reduce((sum, row) => sum + row.amount, 0) !== input.amount) throw new Error("refund_reference_conflict");
      return existing[0];
    }
    let first;
    for (const debit of debits) {
      const refund = await tx.creditTransaction.create({ data: { userId, amount: -debit.amount, type: "REFUND", source: debit.source, expiresAt: debit.expiresAt, reference, description: input.description } });
      first ??= refund;
    }
    return first!;
  });
}

/** Durable execution receipt attached to the paid debit. Zero-value receipts never change the balance. */
export function claimGeneration(userId: string, projectId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const debit = await tx.creditTransaction.findFirst({ where: { userId, reference: projectId, type: "GENERATION", amount: { lt: 0 } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (!debit) return null;
    const reference = `generation-claim:${debit.id}`;
    const existing = await tx.creditTransaction.findFirst({ where: { userId, reference } });
    if (existing) return { debit, claimed: false, startedAt: existing.createdAt };
    const receipt = await tx.creditTransaction.create({ data: { userId, reference, amount: 0, type: "GENERATION", source: "PACK", description: "Internal generation receipt" } });
    return { debit, claimed: true, startedAt: receipt.createdAt };
  });
}

/** À appeler au renouvellement d'abonnement, avant de créditer la nouvelle période. */
export async function expireSubscriptionCredits(userId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const { expired } = await projection(tx, userId);
    if (!expired.length) return null;
    let first;
    for (const lot of expired) {
      const row = await tx.creditTransaction.create({ data: { userId, amount: -lot.remaining, type: "EXPIRATION", source: "SUBSCRIPTION", expiresAt: lot.expiresAt, reference: `expiration:${lot.id}`, description: "Expiration des credits d'abonnement" } });
      first ??= row;
    }
    return first!;
  });
}

export function listCreditTransactions(userId: string, take = 50) {
  return db.creditTransaction.findMany({
    where: { userId, amount: { not: 0 } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, amount: true, type: true, source: true, description: true, createdAt: true, expiresAt: true },
  });
}
