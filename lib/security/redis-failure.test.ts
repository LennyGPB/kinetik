import assert from "node:assert/strict";
import test from "node:test";

test("Redis outages deny paid quotas, locks and budget reservations", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("simulated outage"); };
  try {
    const { rateLimit, acquireLock, reserveBudget } = await import("../rate-limit");
    assert.equal((await rateLimit("paid", { limit: 10, windowMs: 60000, strict: true })).ok, false);
    assert.equal(await acquireLock("paid", 60000, true), null);
    assert.equal(await reserveBudget("paid", 1, 10, 60000), false);
    // Non-costly traffic retains the existing local degradation behavior.
    assert.equal((await rateLimit("read", { limit: 10, windowMs: 60000 })).ok, true);
  } finally { globalThis.fetch = original; }
});
