import assert from "node:assert/strict";
import { test } from "node:test";
import { planFromLookupKey, planLookupKey } from "@/config/pricing";
import { currentSlot } from "./sync";

const d = (iso: string) => new Date(iso);

test("monthly subscription: one slot covering the whole period", () => {
  const slot = currentSlot(d("2026-10-03T10:00:00Z"), d("2026-11-03T10:00:00Z"), d("2026-10-20T00:00:00Z"));
  assert.deepEqual(slot, { start: d("2026-10-03T10:00:00Z"), end: d("2026-11-03T10:00:00Z") });
});

test("yearly subscription: monthly slots from the period start", () => {
  const start = d("2026-01-15T08:00:00Z"), end = d("2027-01-15T08:00:00Z");
  assert.deepEqual(currentSlot(start, end, d("2026-01-15T08:00:00Z")), { start, end: d("2026-02-15T08:00:00Z") });
  assert.deepEqual(currentSlot(start, end, d("2026-06-20T00:00:00Z")), { start: d("2026-06-15T08:00:00Z"), end: d("2026-07-15T08:00:00Z") });
  assert.deepEqual(currentSlot(start, end, d("2027-01-10T00:00:00Z")), { start: d("2026-12-15T08:00:00Z"), end });
});

test("month-end anchor is clamped to shorter months", () => {
  const start = d("2026-01-31T00:00:00Z"), end = d("2027-01-31T00:00:00Z");
  assert.deepEqual(currentSlot(start, end, d("2026-02-28T12:00:00Z")), { start: d("2026-02-28T00:00:00Z"), end: d("2026-03-31T00:00:00Z") });
});

test("no slot outside the paid period", () => {
  assert.equal(currentSlot(d("2026-10-03T00:00:00Z"), d("2026-11-03T00:00:00Z"), d("2026-11-03T00:00:00Z")), null);
  assert.equal(currentSlot(d("2026-10-03T00:00:00Z"), d("2026-11-03T00:00:00Z"), d("2026-10-02T00:00:00Z")), null);
});

test("lookup keys round-trip and reject unknown prices", () => {
  assert.deepEqual(planFromLookupKey(planLookupKey("PRO", "year")), { planId: "PRO", interval: "year" });
  assert.deepEqual(planFromLookupKey(planLookupKey("STARTER", "month")), { planId: "STARTER", interval: "month" });
  assert.equal(planFromLookupKey("kinetik_pack-100"), null);
  assert.equal(planFromLookupKey(null), null);
});
