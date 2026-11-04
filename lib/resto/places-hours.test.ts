import { test } from "node:test";
import assert from "node:assert/strict";
import { hoursFromGoogle } from "./places-hours";

test("horaires Google → lundi = 0, services triés, après minuit gardé sur le jour d'ouverture", () => {
  const hours = hoursFromGoogle([
    { open: { day: 1, hour: 19, minute: 0 }, close: { day: 1, hour: 22, minute: 30 } },
    { open: { day: 1, hour: 12, minute: 0 }, close: { day: 1, hour: 14, minute: 30 } },
    { open: { day: 6, hour: 18 }, close: { day: 0, hour: 2 } },
  ]);
  assert.deepEqual(hours, [
    { day: 0, ranges: [{ open: "12:00", close: "14:30" }, { open: "19:00", close: "22:30" }] },
    { day: 5, ranges: [{ open: "18:00", close: "02:00" }] },
  ]);
});

test("ouvert 24 h/24, rien, ou incohérent", () => {
  assert.deepEqual(hoursFromGoogle([{ open: { day: 0, hour: 0, minute: 0 } }]), [{ day: 6, ranges: [{ open: "00:00", close: "23:59" }] }]);
  assert.equal(hoursFromGoogle(undefined), null);
  assert.equal(hoursFromGoogle([
    { open: { day: 2, hour: 12 }, close: { day: 2, hour: 15 } },
    { open: { day: 2, hour: 14 }, close: { day: 2, hour: 18 } },
  ]), null);
});
