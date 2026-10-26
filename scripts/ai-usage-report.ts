/**
 * Rentabilité du chat de l'éditeur : coût réel des demandes (table AiUsage) face aux crédits débités.
 *
 *   npm run ai:usage            → 7 derniers jours
 *   npm run ai:usage -- 30      → 30 derniers jours
 *
 * Revenu d'un crédit selon l'offre (config/pricing.ts) : de 0,089 € (pack 1000) à 0,145 € (Starter mensuel).
 * Une demande est « à perte » si son coût dépasse ses crédits × REVENUE_FLOOR_USD (revenu le plus bas, converti en dollars).
 */
import { EDIT_PRICING, editCreditsForCost } from "../config/credits";
import { db } from "../lib/db";

const REVENUE_FLOOR_USD = 0.095;

async function main() {
  const days = Math.max(1, Number(process.argv[2]) || 7);
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.aiUsage.findMany({ where: { createdAt: { gte: since }, operation: "edit" }, select: { plan: true, costMicroUsd: true, credits: true, turns: true, previews: true } });
  if (!rows.length) { console.log(`Aucune demande depuis ${days} jour(s).`); return; }

  const byPlan = new Map<string, typeof rows>();
  for (const row of rows) byPlan.set(row.plan, [...(byPlan.get(row.plan) ?? []), row]);
  const quantile = (values: number[], q: number) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]; };
  const usd = (micro: number) => `${(micro / 1_000_000).toFixed(3)} $`;

  console.log(`Chat de l'éditeur · ${days} derniers jours · ${rows.length} demandes · barème ${EDIT_PRICING.base} à ${EDIT_PRICING.max} crédits, ${EDIT_PRICING.usdPerCredit} $ par crédit\n`);
  for (const [plan, items] of [...byPlan.entries(), ["TOUS", rows] as const]) {
    const costs = items.map((r) => r.costMicroUsd);
    const charged = items.filter((r) => r.credits > 0);
    const totalCost = costs.reduce((a, b) => a + b, 0);
    const totalCredits = items.reduce((sum, r) => sum + r.credits, 0);
    const losses = charged.filter((r) => r.costMicroUsd / 1_000_000 > r.credits * REVENUE_FLOOR_USD).length;
    const capped = charged.filter((r) => r.credits === EDIT_PRICING.max && editCreditsForCost(r.costMicroUsd / 1_000_000) === EDIT_PRICING.max && r.costMicroUsd / 1_000_000 > EDIT_PRICING.max * EDIT_PRICING.usdPerCredit).length;
    console.log(`${plan.padEnd(8)} ${String(items.length).padStart(5)} demandes · coût moyen ${usd(totalCost / items.length)} · médian ${usd(quantile(costs, 0.5))} · 90 % sous ${usd(quantile(costs, 0.9))}`);
    console.log(`${"".padEnd(8)} crédits moyens ${(totalCredits / Math.max(1, charged.length)).toFixed(2)} · coût par crédit ${totalCredits ? usd(totalCost / totalCredits) : "-"} · à perte ${losses} (${Math.round((losses / Math.max(1, charged.length)) * 100)} %) · au-delà du plafond ${capped}`);
    console.log(`${"".padEnd(8)} étapes moyennes ${(items.reduce((s, r) => s + r.turns, 0) / items.length).toFixed(1)} · aperçus ${items.reduce((s, r) => s + r.previews, 0)} · sans changement ${items.length - charged.length}\n`);
  }
  console.log(`Repère : un coût par crédit au-dessus de ${REVENUE_FLOOR_USD} $ signifie une perte sur les packs et l'abonnement annuel ; ajuster EDIT_PRICING (config/credits.ts).`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
