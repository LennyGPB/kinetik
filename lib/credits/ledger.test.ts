import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";

test("concurrent debits, generation claims and refunds preserve ledger invariants", async () => {
  // Transaction adapter with a real asynchronous row-lock queue; no external DB or paid API.
  const require = createRequire(path.join(process.cwd(), "lib/credits/ledger.test.ts"));
  const rows: Record<string, unknown>[] = [{ id: "initial", userId: "user", amount: 1, source: "PACK", type: "SIGNUP_BONUS", createdAt: new Date(), expiresAt: null }];
  let tail = Promise.resolve();
  const matches = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return (row[key] as Date)?.getTime() === value.getTime();
    if (typeof value === "object" && value !== null) {
      if ("lt" in value) return Number(row[key]) < Number(value.lt);
      if ("gt" in value) return Number(row[key]) > Number(value.gt);
      if ("in" in value) return (value.in as unknown[]).includes(row[key]);
    }
    return row[key] === value;
  });
  const transactions = {
    async findMany({ where }: { where: Record<string, unknown> }) { return rows.filter((row) => matches(row, where)); },
    async groupBy() { return ["PACK", "SUBSCRIPTION"].map((source) => ({ source, _sum: { amount: rows.filter((r) => r.source === source).reduce((sum, r) => sum + Number(r.amount), 0) } })); },
    async findFirst({ where, orderBy }: { where: Record<string, unknown>; orderBy?: unknown }) {
      const found = rows.filter((row) => Object.entries(where).every(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          if ("lt" in value) return Number(row[key]) < Number(value.lt);
          if ("gt" in value) return Number(row[key]) > Number(value.gt);
        }
        return row[key] === value;
      }));
      return (orderBy ? found.reverse() : found)[0] ?? null;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const row = { ...data, id: `row-${rows.length}`, createdAt: new Date() };
      rows.push(row);
      return row;
    },
  };
  const db = {
    creditTransaction: transactions,
    async $transaction(callback: (tx: unknown) => Promise<unknown>) {
      let release: (() => void) | undefined;
      try {
        return await callback({ creditTransaction: transactions, $queryRaw: async (query: TemplateStringsArray) => {
          assert.match(query.join("?"), /SELECT id FROM "User" WHERE id = .* FOR UPDATE/);
          const previous = tail;
          tail = new Promise<void>((resolve) => { release = resolve; });
          await previous;
          return [{ id: "user" }];
        } });
      } finally { release?.(); }
    },
  };
  const dbPath = require.resolve("../db");
  const original = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { db } } as NodeJS.Module;
  try {
    const { spendCredits, refundCredits, claimGeneration, InsufficientCreditsError } = require("./ledger") as typeof import("./ledger");
    const attempts = await Promise.allSettled(Array.from({ length: 10 }, () => spendCredits("user", { amount: 1, type: "EDIT", description: "edit", reference: "operation-1" })));
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    for (const attempt of attempts) if (attempt.status === "rejected") assert.ok(attempt.reason instanceof InsufficientCreditsError);
    assert.equal(rows.reduce((sum, row) => sum + Number(row.amount), 0), 0);
    await Promise.all(Array.from({ length: 10 }, () => refundCredits("user", { amount: 1, description: "refund", reference: "operation-1" })));
    assert.equal(rows.filter((r) => r.type === "REFUND").length, 1);
    rows.push({ id: "generation-debit", userId: "user", amount: -10, source: "PACK", type: "GENERATION", reference: "project", createdAt: new Date() });
    const claims = await Promise.all(Array.from({ length: 10 }, () => claimGeneration("user", "project")));
    assert.equal(claims.filter((claim) => claim?.claimed).length, 1);
    assert.equal(rows.filter((r) => r.reference === "generation-claim:generation-debit").length, 1);
  } finally {
    if (original) require.cache[dbPath] = original;
    else delete require.cache[dbPath];
  }
});
