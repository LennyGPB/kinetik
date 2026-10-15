import assert from "node:assert/strict";
import test from "node:test";
import { allowAiAttempt, positiveInteger, reserveAiTokens } from "./ai-guard";

test("invalid budget configuration fails closed", () => {
  for (const value of ["-1", "NaN", "Infinity", "1.2", "0"]) assert.equal(positiveInteger(value, 100), 0);
  assert.equal(positiveInteger(undefined, 100), 100);
});

test("free AI quotas are shared across operations and are not restored by refunds", async () => {
  const caller = { userId: `free-${Math.random()}`, plan: "FREE" as const };
  for (let i = 0; i < 6; i++) assert.equal(await allowAiAttempt(caller), true);
  assert.equal(await allowAiAttempt(caller), false);
  assert.equal(await allowAiAttempt({ ...caller, userId: "" }), false);
});

test("global budget bounds many separate accounts", async () => {
  const old = process.env.AI_GLOBAL_DAILY_CALLS;
  process.env.AI_GLOBAL_DAILY_CALLS = "2";
  try {
    assert.equal(await allowAiAttempt({ userId: "budget-a", plan: "FREE" }), true);
    assert.equal(await allowAiAttempt({ userId: "budget-b", plan: "PRO" }), true);
    assert.equal(await allowAiAttempt({ userId: "budget-c", plan: "FREE" }), false);
  } finally {
    if (old === undefined) delete process.env.AI_GLOBAL_DAILY_CALLS;
    else process.env.AI_GLOBAL_DAILY_CALLS = old;
  }
});

test("token reservations include the full output and reject oversized contexts", async () => {
  const old = process.env.AI_GLOBAL_DAILY_TOKENS;
  process.env.AI_GLOBAL_DAILY_TOKENS = "10000";
  try {
    assert.equal(await reserveAiTokens(24001), false);
    assert.equal(await reserveAiTokens(1), true);
    assert.equal(await reserveAiTokens(1), false);
  } finally {
    if (old === undefined) delete process.env.AI_GLOBAL_DAILY_TOKENS;
    else process.env.AI_GLOBAL_DAILY_TOKENS = old;
  }
});
