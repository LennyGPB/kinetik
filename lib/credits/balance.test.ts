import assert from "node:assert/strict";
import test from "node:test";
import { projectBalance, type LedgerEntry } from "./balance";
import { PLANS, CREDIT_PACKS } from "@/config/pricing";
import { CREDIT_COSTS, SIGNUP_BONUS_CREDITS, getExportCost } from "@/config/credits";

const now = new Date("2026-10-15T12:00:00Z");
const old = new Date("2026-10-01T00:00:00Z");
const end = new Date("2026-11-01T00:00:00Z");
const row = (id: string, amount: number, source: string, expiresAt: Date | null, createdAt = new Date("2026-09-01T00:00:00Z"), type = amount > 0 ? "SUBSCRIPTION" : "EDIT"): LedgerEntry => ({ id, amount, source, expiresAt, createdAt, type });

test("expired allowances are excluded independently of the expiration job", () => {
  const balance = projectBalance([row("old", 200, "SUBSCRIPTION", old), row("pack", 30, "PACK", null)], now);
  assert.equal(balance.total, 30);
  assert.equal(balance.subscriptionExpiresAt, null);
  assert.equal(balance.expired[0].remaining, 200);
});

test("legacy untagged subscription debits are allocated before renewal", () => {
  const balance = projectBalance([
    row("old", 200, "SUBSCRIPTION", old),
    row("used", -50, "SUBSCRIPTION", null, new Date("2026-09-15T00:00:00Z")),
    row("new", 200, "SUBSCRIPTION", end, new Date("2026-10-01T00:00:00Z")),
  ], now);
  assert.equal(balance.subscription, 200);
  assert.equal(balance.expired[0].remaining, 150);
});

test("late expiration cannot consume new-period credits", () => {
  const balance = projectBalance([
    row("old", 200, "SUBSCRIPTION", old),
    row("new", 200, "SUBSCRIPTION", end, new Date("2026-10-01T00:00:00Z")),
    row("expiration", -200, "SUBSCRIPTION", old, new Date("2026-10-02T00:00:00Z"), "EXPIRATION"),
  ], now);
  assert.equal(balance.subscription, 200);
  assert.equal(balance.expired.length, 0);
});

test("refunds preserve their original expiration and do not become packs", () => {
  const balance = projectBalance([
    row("grant", 10, "SUBSCRIPTION", old),
    row("spend", -10, "SUBSCRIPTION", old, new Date("2026-09-15T00:00:00Z")),
    row("refund", 10, "SUBSCRIPTION", old, new Date("2026-10-05T00:00:00Z"), "REFUND"),
  ], now);
  assert.equal(balance.total, 0);
  assert.equal(balance.pack, 0);
  assert.equal(balance.expired[0].remaining, 10);
});

test("expiration boundary is exclusive and earliest period is consumed first", () => {
  const rows = [row("later", 20, "SUBSCRIPTION", end), row("earlier", 10, "SUBSCRIPTION", now), row("debit", -5, "SUBSCRIPTION", now, new Date("2026-09-15T00:00:00Z"))];
  assert.equal(projectBalance(rows, new Date(now.getTime() - 1)).subscription, 25);
  assert.equal(projectBalance(rows, now).subscription, 20);
  assert.equal(projectBalance(rows, now).subscriptionExpiresAt?.getTime(), end.getTime());
});

test("offer invariants and export thresholds stay consistent", () => {
  assert.equal(PLANS.find((p) => p.id === "FREE")?.credits, SIGNUP_BONUS_CREDITS);
  assert.ok(CREDIT_COSTS.edit < CREDIT_COSTS.generation);
  assert.equal(getExportCost({ duration: 30, quality: "HD" }), 5);
  assert.equal(getExportCost({ duration: 30.5, quality: "HD" }), 10);
  assert.equal(getExportCost({ duration: 15, quality: "UHD" }), 10);
  for (const plan of PLANS.filter((plan) => plan.id !== "FREE")) {
    assert.ok(Number.isInteger(plan.credits) && plan.credits > 0);
    assert.ok(plan.yearlyPrice < plan.monthlyPrice && plan.yearlyPrice > 0);
  }
  for (let i = 1; i < CREDIT_PACKS.length; i++) assert.ok(CREDIT_PACKS[i].price / CREDIT_PACKS[i].credits <= CREDIT_PACKS[i - 1].price / CREDIT_PACKS[i - 1].credits);
});
