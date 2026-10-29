import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/** A disposable schema, never public tables. Run with --env-file=.env and react-server conditions. */
async function main() {
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL?.replace("-pooler.", ".");
  if (!connectionString) throw new Error("test_database_url_missing");
  const schema = `credits_test_${randomBytes(12).toString("hex")}`;
  assert.match(schema, /^credits_test_[a-f0-9]{24}$/);
  const admin = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
  let client: PrismaClient | undefined;
  let pool: pg.Pool | undefined;
  let created = false;
  let passed = 0;
  try {
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await admin.query(`SET search_path TO "${schema}"`);
    const migrations = path.join(process.cwd(), "prisma", "migrations");
    for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const sql = await readFile(path.join(migrations, entry.name, "migration.sql"), "utf8");
      // Refuse future migrations explicitly targeting the application's public schema.
      if (/\bpublic\s*\./i.test(sql) || /\b(?:SET\s+search_path|CREATE\s+SCHEMA|DROP\s+SCHEMA)\b/i.test(sql)) throw new Error("unsafe_test_migration");
      await admin.query(sql);
    }
    pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 10000, options: `-c search_path=${schema}` });
    const check = await pool.query("SELECT current_schema() AS schema");
    assert.equal(check.rows[0].schema, schema);
    client = new PrismaClient({ adapter: new PrismaPg(pool, { schema }), transactionOptions: { maxWait: 20000, timeout: 20000 } });
    (globalThis as { prisma?: PrismaClient }).prisma = client;
    const ledger = await import("../lib/credits/ledger");
    const end = new Date(Date.now() + 30 * 86_400_000);
    const start = new Date(Date.now() - 1000);
    const old = new Date(Date.now() - 86_400_000);
    let sequence = 0;
    const run = async (name: string, test: (userId: string) => Promise<void>) => {
      const user = await client!.user.create({ data: { name: "Credit integration test", email: `test-${++sequence}@example.invalid` } });
      await test(user.id);
      passed++;
      console.log(`PASS ${name}`);
    };
    const pack = (userId: string, amount: number, reference = "purchase") => ledger.grantCredits(userId, { amount, type: "PURCHASE", source: "PACK", reference, description: "Test purchase" });
    const sub = (userId: string, amount: number) => ledger.grantCredits(userId, { amount, type: "SUBSCRIPTION", source: "SUBSCRIPTION", reference: "invoice", expiresAt: end, description: "Test subscription" });

    await run("new account starts with no credits", async (id) => {
      assert.equal((await ledger.getCreditBalance(id)).total, 0);
    });
    await run("purchase replay and concurrent delivery credit once", async (id) => {
      await Promise.all(Array.from({ length: 5 }, () => pack(id, 100)));
      assert.equal((await ledger.getCreditBalance(id)).total, 100);
      assert.equal(await client!.creditTransaction.count({ where: { userId: id } }), 1);
      await assert.rejects(pack(id, 300), /credit_reference_conflict/);
    });
    await run("first Starter invoice updates plan and credits atomically", async (id) => {
      await Promise.all(Array.from({ length: 3 }, () => ledger.renewSubscriptionCredits(id, { planId: "STARTER", reference: "invoice-period-1", startsAt: start, endsAt: end })));
      assert.equal((await ledger.getCreditBalance(id)).subscription, 200);
      assert.equal((await client!.user.findUniqueOrThrow({ where: { id } })).plan, "STARTER");
      await assert.rejects(ledger.renewSubscriptionCredits(id, { planId: "PRO", reference: "second-overlap", startsAt: start, endsAt: end }), /subscription_period_overlap/);
      assert.equal((await ledger.getCreditBalance(id)).total, 200);
    });
    await run("Pro monthly allowance is 600, not 12 times more for annual billing", async (id) => {
      const annualEnd = new Date(Date.now() + 365 * 86_400_000);
      await ledger.renewSubscriptionCredits(id, { planId: "PRO", reference: "paid-annual-month-1", startsAt: start, endsAt: end, accessEndsAt: annualEnd });
      assert.equal((await ledger.getCreditBalance(id)).subscription, 600);
      assert.equal((await client!.user.findUniqueOrThrow({ where: { id } })).planRenewsAt?.getTime(), annualEnd.getTime());
    });
    await run("subscription credits are spent before permanent packs", async (id) => {
      await sub(id, 200); await pack(id, 30);
      const balance = await ledger.spendCredits(id, { amount: 210, type: "EXPORT", reference: "render", description: "Test mixed spend" });
      assert.equal(balance.subscription, 0); assert.equal(balance.pack, 20);
      const debits = await client!.creditTransaction.findMany({ where: { userId: id, amount: { lt: 0 } } });
      assert.equal(debits.find((row) => row.source === "SUBSCRIPTION")?.expiresAt?.getTime(), end.getTime());
    });
    await run("expired credits are unavailable even when expiration job was missed", async (id) => {
      await client!.creditTransaction.create({ data: { userId: id, amount: 200, source: "SUBSCRIPTION", type: "SUBSCRIPTION", expiresAt: old, createdAt: new Date(old.getTime() - 86_400_000), description: "Test expired" } });
      await pack(id, 30);
      assert.equal((await ledger.getCreditBalance(id)).total, 30);
      await assert.rejects(ledger.spendCredits(id, { amount: 31, type: "GENERATION", description: "Test insufficient" }), ledger.InsufficientCreditsError);
    });
    await run("renewal excludes old allowance and expiration is idempotent", async (id) => {
      await client!.creditTransaction.create({ data: { userId: id, amount: 200, source: "SUBSCRIPTION", type: "SUBSCRIPTION", expiresAt: old, createdAt: new Date(old.getTime() - 86_400_000), description: "Test old period" } });
      await pack(id, 30);
      await ledger.renewSubscriptionCredits(id, { planId: "STARTER", reference: "next-invoice", startsAt: start, endsAt: end });
      assert.equal((await ledger.getCreditBalance(id)).total, 230);
      await Promise.all(Array.from({ length: 3 }, () => ledger.expireSubscriptionCredits(id)));
      assert.equal((await ledger.getCreditBalance(id)).total, 230);
      assert.equal(await client!.creditTransaction.count({ where: { userId: id, type: "EXPIRATION" } }), 1);
    });
    await run("mixed refunds restore original sources once, even via alternate reference", async (id) => {
      await sub(id, 5); await pack(id, 5);
      await ledger.spendCredits(id, { amount: 10, type: "GENERATION", reference: "project", description: "Test generation" });
      const claim = await ledger.claimGeneration(id, "project");
      assert.ok(claim?.claimed);
      await Promise.all([
        ledger.refundCredits(id, { amount: 10, reference: claim.debit.id, description: "Test refund" }),
        ledger.refundCredits(id, { amount: 10, reference: "project", description: "Test refund replay" }),
      ]);
      const balance = await ledger.getCreditBalance(id);
      assert.equal(balance.subscription, 5); assert.equal(balance.pack, 5);
      assert.equal(await client!.creditTransaction.count({ where: { userId: id, type: "REFUND" } }), 2);
    });
    await run("refund after period end cannot mint permanent credits", async (id) => {
      await sub(id, 10);
      await ledger.spendCredits(id, { amount: 10, type: "EDIT", reference: "edit", description: "Test edit" });
      await client!.creditTransaction.updateMany({ where: { userId: id, source: "SUBSCRIPTION" }, data: { expiresAt: old } });
      await ledger.refundCredits(id, { amount: 10, reference: "edit", description: "Test late refund" });
      assert.equal((await ledger.getCreditBalance(id)).total, 0);
      assert.equal((await ledger.getCreditBalance(id)).pack, 0);
    });
    await run("concurrent debits cannot overspend", async (id) => {
      await pack(id, 1);
      const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => ledger.spendCredits(id, { amount: 1, type: "EDIT", reference: `edit-${i}`, description: "Test concurrent" })));
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      for (const result of results) if (result.status === "rejected") assert.ok(result.reason instanceof ledger.InsufficientCreditsError);
      assert.equal((await ledger.getCreditBalance(id)).total, 0);
    });
    await run("invalid amounts and unsupported refunds create no credits", async (id) => {
      for (const amount of [-1, 0, 1.5, NaN, Infinity]) await assert.rejects(pack(id, amount));
      await assert.rejects(ledger.refundCredits(id, { amount: 1, reference: "missing", description: "Test invalid refund" }), /refund_debit_mismatch/);
      assert.equal(await client!.creditTransaction.count({ where: { userId: id } }), 0);
    });
    await run("failed business commit rolls back debit", async (id) => {
      await pack(id, 10);
      await assert.rejects(ledger.spendCredits(id, { amount: 10, type: "EXPORT", description: "Test rollback" }, async () => { throw new Error("simulated_failure"); }), /simulated_failure/);
      assert.equal((await ledger.getCreditBalance(id)).total, 10);
    });
    console.log(`PostgreSQL: ${passed} scenarios passed. No Stripe, Claude or Lambda calls.`);
  } finally {
    await client?.$disconnect();
    await pool?.end();
    if (created) {
      assert.match(schema, /^credits_test_[a-f0-9]{24}$/);
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      console.log("Disposable test schema removed; application tables unchanged.");
    }
    await admin.end();
  }
}
void main().catch((error: unknown) => {
  console.error("Credit integration tests failed:", error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]") : "UnknownError");
  process.exitCode = 1;
});
