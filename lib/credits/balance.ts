export type LedgerEntry = {
  id: string; amount: number; source: string; type: string; expiresAt: Date | null; createdAt: Date;
};
export type CreditLot = { id: string; remaining: number; expiresAt: Date | null };

/** Replay subscription lots so expired balances cannot be spent, even without a cron job. */
export function projectBalance(entries: LedgerEntry[], now = new Date()) {
  const lots: CreditLot[] = [];
  let pack = 0;
  const ordered = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    || (b.amount > 0 ? 1 : 0) - (a.amount > 0 ? 1 : 0) || a.id.localeCompare(b.id));
  for (const row of ordered) {
    if (row.source === "PACK") { pack += row.amount; continue; }
    if (row.amount > 0) {
      lots.push({ id: row.id, remaining: row.amount, expiresAt: row.expiresAt });
      lots.sort((a, b) => (a.expiresAt?.getTime() ?? Infinity) - (b.expiresAt?.getTime() ?? Infinity));
    } else if (row.amount < 0) {
      let debit = -row.amount;
      for (const lot of lots) {
        // New debits/expirations are tied to their original period. Legacy debits use FIFO.
        if (row.expiresAt && lot.expiresAt?.getTime() !== row.expiresAt.getTime()) continue;
        const used = Math.min(lot.remaining, debit);
        lot.remaining -= used;
        debit -= used;
        if (!debit) break;
      }
    }
  }
  const active = lots.filter((lot) => lot.remaining > 0 && (!lot.expiresAt || lot.expiresAt > now));
  const expired = lots.filter((lot) => lot.remaining > 0 && lot.expiresAt && lot.expiresAt <= now);
  const subscription = active.reduce((sum, lot) => sum + lot.remaining, 0);
  return {
    total: Math.max(0, pack) + subscription, pack: Math.max(0, pack), subscription,
    subscriptionExpiresAt: active.find((lot) => lot.expiresAt)?.expiresAt ?? null,
    active, expired,
  };
}
