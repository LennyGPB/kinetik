import "server-only";
import { getCreditBalance, grantCredits } from "./ledger";

/** Un admin n'est jamais bloqué faute de crédits : sous ce seuil, son solde est recomplété (ajustement gratuit). */
const ADMIN_FLOOR = 2_000;
const ADMIN_TARGET = 10_000;

export async function ensureAdminCredits(userId: string) {
  const { total } = await getCreditBalance(userId);
  if (total >= ADMIN_FLOOR) return;
  await grantCredits(userId, { amount: ADMIN_TARGET - total, type: "ADJUSTMENT", source: "PACK", description: "Crédits admin (gratuits)" });
}
